package src

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

type ReactionInfo struct {
	ReactionType    string `json:"reactionType"`
	PostOrCommentId int    `json:"postOrCommentId"`
	PostType        string `json:"postType"`
	UserId          int    `json:"userId"`
}

func ReactionHandler(w http.ResponseWriter, r *http.Request) {
	var reactionInfo ReactionInfo
	err := json.NewDecoder(r.Body).Decode(&reactionInfo)
	if err != nil {
		log.Println(err)
		return
	}

	addReaction(reactionInfo.PostOrCommentId, reactionInfo.UserId, reactionInfo.ReactionType, reactionInfo.PostType)
	w.WriteHeader(http.StatusOK)
}

func addReaction(postOrCommentId, userId int, reactionType, postType string) {
	dataBase, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}
	var reaction string
	if err := dataBase.QueryRow("SELECT reactionType FROM reactions WHERE "+postType+"Id=? AND userId=?", postOrCommentId, userId).Scan(&reaction); err != nil {
		statement, _ := dataBase.Prepare("INSERT INTO reactions (reactionType, " + postType + "Id, userID) VALUES (?, ?, ?)")
		statement.Exec(reactionType, postOrCommentId, userId)
	} else {
		if reaction == reactionType {
			dataBase.Exec("DELETE FROM reactions WHERE "+postType+"Id=? AND userID=?", postOrCommentId, userId)
		} else {
			dataBase.Exec("UPDATE reactions SET reactionType=? WHERE "+postType+"Id=? AND userID=?", reactionType, postOrCommentId, userId)
		}
	}
	updateReactionCount(dataBase, postOrCommentId, postType, "like")
	updateReactionCount(dataBase, postOrCommentId, postType, "dislike")
}

func updateReactionCount(db *sql.DB, postOrCommentId int, postType, reactionType string) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM reactions WHERE "+postType+"Id = ? AND reactionType = ?", postOrCommentId, reactionType).Scan(&count)
	if err != nil {
		log.Println(err)
	}

	query := "UPDATE " + postType + "s SET " + reactionType + "s = ? WHERE " + postType + "Id = ?"
	_, err = db.Exec(query, count, postOrCommentId)
	if err != nil {
		log.Println(err)
	}
}
