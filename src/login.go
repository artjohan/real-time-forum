package src

import (
	"database/sql"
	"encoding/json"
	"fmt"
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
	UserID   int    `json:"userId"`
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var loginInfo LoginInfo
	err := json.NewDecoder(r.Body).Decode(&loginInfo)
	if err != nil {
		fmt.Println(err)
		return
	}

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
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

	row = db.QueryRow("SELECT nickname FROM users WHERE nickname = ? OR email = ?", loginInfo.NicknameOrEmail, loginInfo.NicknameOrEmail)
	var nickname string
	row.Scan(&nickname)

	response := LoginResponse{
		Nickname: nickname,
		UserID:   getUserId(loginInfo.NicknameOrEmail),
	}

	createCookie(w, loginInfo.NicknameOrEmail)
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		fmt.Println(err)
		return
	}
}

func createCookie(w http.ResponseWriter, nicknameOrEmail string) {
	userId := getUserId(nicknameOrEmail)
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
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
		fmt.Println(err)
	}
	statement.Exec(sessionValue, userId)
}

func getUserId(nicknameOrEmail string) int {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return -1
	}
	var userId int
	db.QueryRow("SELECT userId FROM users WHERE nickname = ? OR email = ?", nicknameOrEmail, nicknameOrEmail).Scan(&userId)
	return userId
}

func CookieHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	// check if a session exists for the given userId
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM sessions WHERE userId = ?)", userId).Scan(&exists)
	if err != nil {
		fmt.Println(err)
		return
	}

	if exists {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Session exists for user with ID: " + userId))
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Session does not exist for user with ID: " + userId))
	}
}

