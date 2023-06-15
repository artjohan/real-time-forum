package src

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

func getUserId(nicknameOrEmail string) int {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
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

func addMessageToTable(messageData ReturnMessageEvent) {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}

	statement, err := db.Prepare("INSERT INTO messages (senderId, receiverId, sentDate, message) VALUES (?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = statement.Exec(messageData.SenderId, messageData.ReceiverId, messageData.SentDate, messageData.Message)
	if err != nil {
		log.Println(err)
		return
	}
}

func getChatData(currentChatterId, otherChatterId, amount int) ReturnChatDataEvent {
	var returnChatData ReturnChatDataEvent
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
	}
	returnChatData.CurrentChatterNickname = getNicknameById(currentChatterId)
	returnChatData.OtherChatterNickname = getNicknameById(otherChatterId)

	rows, err := db.Query(`
		SELECT senderId, receiverId, message, sentDate FROM messages 
		WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
		ORDER BY sentDate DESC LIMIT ?`, currentChatterId, otherChatterId, otherChatterId, currentChatterId, amount)
	if err != nil {
		log.Println(err)
	}

	for rows.Next() {
		var messageData ReturnMessageEvent
		rows.Scan(&messageData.SenderId, &messageData.ReceiverId, &messageData.Message, &messageData.SentDate)
		fmt.Println(messageData)
		returnChatData.Messages = append(returnChatData.Messages, messageData)
	}
	reverseSlice(returnChatData.Messages)

	return returnChatData
}

func reverseSlice(s []ReturnMessageEvent) {
    for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
        s[i], s[j] = s[j], s[i]
    }
}

func getNicknameById(userId int) string {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
	}
	var nickname string
	db.QueryRow("SELECT nickname FROM users WHERE userId = ?", userId).Scan(&nickname)
	return nickname
}
