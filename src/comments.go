package src

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

type CreateCommentInfo struct {
	CommentContent string `json:"commentContent"`
	CreatorId      int    `json:"creatorId"`
	PostId         int    `json:"postId"`
}

type CommentInfo struct {
	CommentId             int    `json:"commentId"`
	CommentContent        string `json:"commentContent"`
	CreatorId             int    `json:"creatorId"`
	CreatorNickname       string `json:"creatorNickname"`
	Likes                 int    `json:"likes"`
	Dislikes              int    `json:"dislikes"`
	CreationDate          string `json:"creationDate"`
	LikedByCurrentUser    bool   `json:"likedByCurrentUser"`
	DislikedByCurrentUser bool   `json:"dislikedByCurrentUser"`
}

type GetPostAndCommentsInfo struct {
	ParentPostInfo GetPostInfo   `json:"parentPostInfo"`
	CommentsInfo   []CommentInfo `json:"commentsInfo"`
}

func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	var createCommentInfo CreateCommentInfo
	err := json.NewDecoder(r.Body).Decode(&createCommentInfo)
	if err != nil {
		fmt.Println(err)
		return
	}

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	statement, err := db.Prepare("INSERT INTO comments (content, postId, userId, creationDate) VALUES (?, ?, ?, ?)")
	if err != nil {
		fmt.Println(err)
		return
	}

	_, err = statement.Exec(createCommentInfo.CommentContent, createCommentInfo.PostId, createCommentInfo.CreatorId, getCurrentDate())
	if err != nil {
		fmt.Println(err)
		return
	}

	updatePostComments(db, createCommentInfo.PostId)
}

func GetPostDetailsHandler(w http.ResponseWriter, r *http.Request) {
	postId := r.URL.Query().Get("postId")
	userId := r.URL.Query().Get("userId")
	var postAndCommentsInfo GetPostAndCommentsInfo
	postAndCommentsInfo.ParentPostInfo = getParentPostInfo(userId, postId)

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	query := `
		SELECT c.commentId, c.content AS commentContent, 
			c.userId AS creatorId, u.nickname AS creatorNickname,
			c.likes, c.dislikes, c.creationDate
		FROM comments AS c
		INNER JOIN users AS u ON c.userId = u.userId
		WHERE c.postId = ` + postId

	postAndCommentsInfo.CommentsInfo = getCommentsByQuery(db, query, userId)

	jsonData, err := json.Marshal(postAndCommentsInfo)
	if err != nil {
		fmt.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func getCommentsByQuery(db *sql.DB, query, userId string) []CommentInfo {
	rows, err := db.Query(query)
	if err != nil {
		fmt.Println(err)
	}

	var comments []CommentInfo
	for rows.Next() {
		var comment CommentInfo
		err := rows.Scan(
			&comment.CommentId, &comment.CommentContent, &comment.CreatorId,
			&comment.CreatorNickname, &comment.Likes, &comment.Dislikes,
			&comment.CreationDate,
		)
		if err != nil {
			fmt.Println(err)
		}

		userReaction := userReactionType(db, comment.CommentId, userId, "comment")
		if userReaction != "" {
			if userReaction == "like" {
				comment.LikedByCurrentUser = true
			} else {
				comment.DislikedByCurrentUser = true
			}
		}

		comments = append(comments, comment)
	}
	return comments
}

func getParentPostInfo(userId, postId string) GetPostInfo {
	var parentPost GetPostInfo
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
	}

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		WHERE p.postId = ?
	`

	err = db.QueryRow(query, postId).Scan(&parentPost.PostId, &parentPost.PostHeader, &parentPost.PostContent, &parentPost.CreatorId,
		&parentPost.CreatorNickname, &parentPost.Likes, &parentPost.Dislikes, &parentPost.Comments,
		&parentPost.CreationDate)

	if err != nil {
		fmt.Println(err)
	}
	userReaction := userReactionType(db, parentPost.PostId, userId, "post")
	if userReaction != "" {
		if userReaction == "like" {
			parentPost.LikedByCurrentUser = true
		} else {
			parentPost.DislikedByCurrentUser = true
		}
	}
	return parentPost
}

func updatePostComments(db *sql.DB, postId int) {
	query := "UPDATE posts SET comments = comments + 1 WHERE postId = ?"
	_, err := db.Exec(query, postId)
	if err != nil {
		fmt.Println(err)
	}
}

func userReactionType(db *sql.DB, postOrCommentId int, userId, postType string) string {
	var reaction string
	db.QueryRow("SELECT reactionType FROM reactions WHERE "+postType+"Id=? AND userId=?", postOrCommentId, userId).Scan(&reaction)
	return reaction
}
