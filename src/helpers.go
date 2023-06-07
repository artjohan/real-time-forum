package src

import (
	"database/sql"
	"fmt"
	"time"
)

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

// removes dupe strings from slice
func removeDuplicateStr(strSlc []string) []string {
	allKeys := make(map[string]bool)
	list := []string{}
	for _, item := range strSlc {
		if item != "" {
			if _, value := allKeys[item]; !value {
				allKeys[item] = true
				list = append(list, item)
			}
		}
	}
	return list
}

func getCurrentDate() string {
	return time.Now().Format("02-01-2006, 15:04")
}
