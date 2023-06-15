package src

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gofrs/uuid"
)

type LoginInfo struct {
	NicknameOrEmail string `json:"nicknameOrEmail"`
	Password        string `json:"password"`
}

type LoginResponse struct {
	Nickname string `json:"nickname"`
	UserId   int    `json:"userId"`
	CookieId string `json:"cookieId"`
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var loginInfo LoginInfo
	err := json.NewDecoder(r.Body).Decode(&loginInfo)
	if err != nil {
		log.Println(err)
		return
	}

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}

	row := db.QueryRow("SELECT password FROM users WHERE nickname = ? OR email = ?", loginInfo.NicknameOrEmail, loginInfo.NicknameOrEmail)
	var passwordQ string
	row.Scan(&passwordQ)

	if passwordQ != loginInfo.Password {
		var errReason string
		if passwordQ == "" {
			errReason = "User does not exist"
		} else {
			errReason = "Incorrect password"
		}

		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Login unsuccessful: " + errReason))
		return
	}

	var nickname string
	db.QueryRow("SELECT nickname FROM users WHERE nickname = ? OR email = ?", loginInfo.NicknameOrEmail, loginInfo.NicknameOrEmail).Scan(&nickname)

	sessionId := createCookie(w, loginInfo.NicknameOrEmail)

	response := LoginResponse{
		Nickname: nickname,
		UserId:   getUserId(loginInfo.NicknameOrEmail),
		CookieId: sessionId,
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		log.Println(err)
		return
	}
}

func createCookie(w http.ResponseWriter, nicknameOrEmail string) string {
	userId := getUserId(nicknameOrEmail)
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return ""
	}

	sessionValue := uuid.Must(uuid.NewV4()).String()
	http.SetCookie(w, &http.Cookie{
		Name:   "sessionForUserId" + strconv.Itoa(userId),
		Value:  sessionValue,
		MaxAge: int(24 * time.Hour),
	})
	db.Exec("DELETE FROM sessions WHERE userId=?", userId) // deletes previous session from the same user to avoid double sessions from one user
	statement, err := db.Prepare("INSERT INTO sessions (sessionKey, userId) VALUES (?, ?)")
	if err != nil {
		log.Println(err)
	}
	statement.Exec(sessionValue, userId)
	return sessionValue
}

func CookieHandler(w http.ResponseWriter, r *http.Request) {
	cookieId := r.URL.Query().Get("cookieId")

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}

	// check if a session exists for the given cookieId
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM sessions WHERE sessionKey = ?)", cookieId).Scan(&exists)
	if err != nil {
		log.Println(err)
		return
	}

	if exists {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Session exists for user"))
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Session does not exist for user"))
	}
}

func LogOutHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:   "sessionForUserId" + userId,
		Value:  "0",
		MaxAge: -1,
	})
	_, err = db.Exec("DELETE FROM sessions WHERE userId=?", userId) // deletes session when user logs out
	if err != nil {
		log.Println(err)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ended session for user with ID: " + userId))
}
