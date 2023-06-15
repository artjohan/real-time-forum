package src

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

type RegisterInfo struct {
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Password  string `json:"password"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	// parse JSON payload into RegisterInfo struct
	var registerInfo RegisterInfo
	err := json.NewDecoder(r.Body).Decode(&registerInfo)
	if err != nil {
		log.Println(err)
		return
	}

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}

	// check if nickname or email already exists
	var nicknameExists bool
	var emailExists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM users WHERE lower(nickname) = lower(?))", registerInfo.Nickname).Scan(&nicknameExists)
	if err != nil {
		log.Println(err)
		return
	}

	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(?))", registerInfo.Email).Scan(&emailExists)
	if err != nil {
		log.Println(err)
		return
	}

	if nicknameExists || emailExists {
		var errReason string
		if nicknameExists {
			errReason += "nickname"
		}
		if emailExists {
			errReason += "email"
		}

		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Registration unsuccessful: " + errReason))
		return
	}

	statement, err := db.Prepare("INSERT INTO users (nickname, email, firstName, lastName, age, gender, password) VALUES (?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = statement.Exec(registerInfo.Nickname, registerInfo.Email, registerInfo.FirstName, registerInfo.LastName,
		registerInfo.Age, registerInfo.Gender, registerInfo.Password)
	if err != nil {
		log.Println(err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Registration successful"))
}
