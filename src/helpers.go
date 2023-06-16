package src

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"
)

func GetNicknameHandler(w http.ResponseWriter, r *http.Request) {
	userId, _ := strconv.Atoi(r.URL.Query().Get("id"))

	jsonData, err := json.Marshal(getNicknameById(userId))
	if err != nil {
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

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
		returnChatData.Messages = append(returnChatData.Messages, messageData)
	}
	reverseSlice(returnChatData.Messages)

	return returnChatData
}

func getChatbarData(currentUserId int) []UserDataEvent {
	var userDataSlc []UserDataEvent
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
	}

	rows, err := db.Query(`SELECT userId, nickname, online FROM users WHERE userId != ? ORDER BY nickname ASC`, currentUserId)
	if err != nil {
		log.Println(err)
	}

	for rows.Next() {
		var userData UserDataEvent
		rows.Scan(&userData.UserId, &userData.Nickname, &userData.Online)
		userData.LastMsgData = getLastMsgData(currentUserId, userData.UserId)
		userDataSlc = append(userDataSlc, userData)
	}

	orderBySentDate(userDataSlc)

	return userDataSlc
}

func reverseSlice(s []ReturnMessageEvent) {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
}

func orderBySentDate(userDataSlc []UserDataEvent) {
	
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

func getLastMsgData(currentUserId, senderId int) ReturnMessageEvent {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
	}

	var lastMsgData ReturnMessageEvent
	err = db.QueryRow(`
		SELECT message, senderId, receiverId, sentDate FROM messages
		WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
		ORDER BY sentDate DESC`, senderId, currentUserId, currentUserId, senderId).Scan(&lastMsgData.Message, &lastMsgData.SenderId, &lastMsgData.ReceiverId, &lastMsgData.SentDate)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Println(err)
		}
	}

	return lastMsgData
}

func updateUserStatus(newStatus bool, userId int) {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
	}

	statement, err := db.Prepare("UPDATE users SET online = ? WHERE userID = ?")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = statement.Exec(newStatus, userId)
	if err != nil {
		log.Println(err)
		return
	}
}
