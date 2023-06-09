package src

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

type UserData struct {
	UserInfo         UserInfo                 `json:"userInfo"`
	CreatedPosts     []GetPostInfo            `json:"createdPosts"`
	CreatedComments  []GetPostAndCommentsInfo `json:"createdComments"`
	LikedPosts       []GetPostInfo            `json:"likedPosts"`
	LikedComments    []GetPostAndCommentsInfo `json:"likedComments"`
	DislikedPosts    []GetPostInfo            `json:"dislikedPosts"`
	DislikedComments []GetPostAndCommentsInfo `json:"dislikedComments"`
}

type UserInfo struct {
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Online    bool   `json:"online"`
}

func GetUserDataHandler(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")
	currentUserId := r.URL.Query().Get("currentUser")
	var userData UserData

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}
	userData.CreatedComments = getCreatedCommentsInfo(db, userId, currentUserId)
	userData.UserInfo = getUserInfo(db, userId)
	userData.CreatedPosts = getCreatedPosts(db, userId)
	userData.LikedPosts = getUserReactedPosts(db, userId, "like")
	userData.DislikedPosts = getUserReactedPosts(db, userId, "dislike")
	userData.LikedComments = getUserReactedCommentsInfo(db, userId, currentUserId, "like")
	userData.DislikedComments = getUserReactedCommentsInfo(db, userId, currentUserId, "dislike")

	jsonData, err := json.Marshal(userData)
	if err != nil {
		fmt.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func getUserInfo(db *sql.DB, userId string) UserInfo {
	var userInfo UserInfo
	row := db.QueryRow("SELECT nickname, email, firstName, lastName, age, gender, online FROM users WHERE userId = ?", userId)

	err := row.Scan(&userInfo.Nickname, &userInfo.Email, &userInfo.FirstName, &userInfo.LastName, &userInfo.Age, &userInfo.Gender, &userInfo.Online)
	if err != nil {
		fmt.Println(err)
	}
	return userInfo
}

func getCreatedCommentsInfo(db *sql.DB, userId, currentUserId string) []GetPostAndCommentsInfo {
	var createdCommentsInfo []GetPostAndCommentsInfo
	parentPosts := getCreatedCommentsParentPosts(db, userId)
	for _, v := range parentPosts {
		var singlePostAndComments GetPostAndCommentsInfo
		singlePostAndComments.ParentPostInfo = v
		singlePostAndComments.CommentsInfo = getUserCreatedCommentsUnderPost(db, userId, currentUserId, strconv.Itoa(v.PostId))
		createdCommentsInfo = append(createdCommentsInfo, singlePostAndComments)
	}
	return createdCommentsInfo
}

func getUserReactedCommentsInfo(db *sql.DB, userId, currentUserId, reactionType string) []GetPostAndCommentsInfo {
	var reactedCommentsInfo []GetPostAndCommentsInfo
	likedParentPosts := getReactedCommentsParentPosts(db, userId, reactionType)
	for _, v := range likedParentPosts {
		var singlePostAndComments GetPostAndCommentsInfo
		singlePostAndComments.ParentPostInfo = v
		singlePostAndComments.CommentsInfo = getUserReactedCommentsUnderPost(db, userId, currentUserId, strconv.Itoa(v.PostId), reactionType)
		reactedCommentsInfo = append(reactedCommentsInfo, singlePostAndComments)
	}
	return reactedCommentsInfo
}

func getCreatedPosts(db *sql.DB, userId string) []GetPostInfo {
	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		WHERE p.userId = ` + userId

	return getPostsByQuery(db, query, userId)
}

func getUserReactedPosts(db *sql.DB, userId, reactionType string) []GetPostInfo {
	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN reactions AS r ON p.postId = r.postId
		WHERE r.userId = ` + userId + ` AND r.reactionType = "` + reactionType + `"`

	return getPostsByQuery(db, query, userId)
}

func getCreatedCommentsParentPosts(db *sql.DB, userId string) []GetPostInfo {
	query := `
		SELECT DISTINCT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN comments AS c ON p.postId = c.postId
		INNER JOIN reactions AS r ON c.commentId = r.commentId
		WHERE r.userId = ` + userId

	return getPostsByQuery(db, query, userId)
}

func getReactedCommentsParentPosts(db *sql.DB, userId string, reactionType string) []GetPostInfo {
	query := `
		SELECT DISTINCT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
		INNER JOIN comments AS c ON p.postId = c.postId
		INNER JOIN reactions AS r ON c.commentId = r.commentId
		WHERE c.userId = ` + userId  + ` AND r.reactionType = "` + reactionType + `"`

	return getPostsByQuery(db, query, userId)
}

func getUserCreatedCommentsUnderPost(db *sql.DB, userId, currentUserId, postId string) []CommentInfo {
	query := `
		SELECT c.commentId, c.content AS commentContent, 
			c.userId AS creatorId, u.nickname AS creatorNickname,
			c.likes, c.dislikes, c.creationDate
		FROM comments AS c
		INNER JOIN users AS u ON c.userId = u.userId
		WHERE c.postId = ` + postId +` AND c.userId = ` + userId
	
	return getCommentsByQuery(db, query, currentUserId)
}

func getUserReactedCommentsUnderPost(db *sql.DB, userId, currentUserId, postId, reactionType string) []CommentInfo {
	query := `
		SELECT c.commentId, c.content AS commentContent, 
			c.userId AS creatorId, u.nickname AS creatorNickname,
			c.likes, c.dislikes, c.creationDate
		FROM comments AS c
		INNER JOIN users AS u ON c.userId = u.userId
		INNER JOIN reactions AS r ON c.commentId = r.commentId
		WHERE r.userId = ` + userId + ` AND r.reactionType = "` + reactionType + `" AND c.postId = ` + postId
	
	return getCommentsByQuery(db, query, currentUserId)
}