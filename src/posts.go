package src

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type CreatePostInfo struct {
	PostHeader  string `json:"postHeader"`
	PostContent string `json:"postContent"`
	Categories  string `json:"categories"`
	CreatorId   int    `json:"creatorId"`
}

type GetPostInfo struct {
	PostId                int      `json:"postId"`
	PostHeader            string   `json:"postHeader"`
	PostContent           string   `json:"postContent"`
	CreatorId             int      `json:"creatorId"`
	CreatorNickname       string   `json:"creatorNickname"`
	Likes                 int      `json:"likes"`
	Dislikes              int      `json:"dislikes"`
	Comments              int      `json:"comments"`
	CreationDate          string   `json:"creationDate"`
	Categories            []string `json:"categories"`
	LikedByCurrentUser    bool     `json:"likedByCurrentUser"`
	DislikedByCurrentUser bool     `json:"dislikedByCurrentUser"`
}

func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	var createPostInfo CreatePostInfo
	err := json.NewDecoder(r.Body).Decode(&createPostInfo)
	if err != nil {
		fmt.Println(err)
		return
	}

	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	statement, err := db.Prepare("INSERT INTO posts (header, content, userId, creationDate) VALUES (?, ?, ?, ?)")
	if err != nil {
		fmt.Println(err)
		return
	}
	_, err = statement.Exec(createPostInfo.PostHeader, createPostInfo.PostContent, createPostInfo.CreatorId, getCurrentDate())
	if err != nil {
		fmt.Println(err)
		return
	}
	createCategories(createPostInfo.Categories)
}

func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	userId := r.URL.Query().Get("userId")
	if err != nil {
		fmt.Println(err)
		return
	}

	query := `
		SELECT p.postId, p.header AS postHeader, p.content AS postContent, 
			p.userId AS creatorId, u.nickname AS creatorNickname,
			p.likes, p.dislikes, p.comments, p.creationDate
		FROM posts AS p
		INNER JOIN users AS u ON p.userId = u.userId
	`

	jsonData, err := json.Marshal(getPostsByQuery(db, query, userId))
	if err != nil {
		fmt.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

// creates the categories if they exist
func createCategories(categories string) {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}
	if categories != "" {
		catSlc := removeDuplicateStr(strings.Split(strings.ReplaceAll(strings.ToUpper(categories), " ", ""), "#"))
		var postId int
		db.QueryRow("SELECT postId FROM posts ORDER BY postId DESC LIMIT 1").Scan(&postId)
		for _, v := range catSlc {
			statement, err := db.Prepare("INSERT INTO categories (categoryName, postId) VALUES (?, ?)")
			if err != nil {
				fmt.Println(err)
				return
			}
			statement.Exec(v, postId)
		}
	}
}

// gets the categories for each post
func getCategories(postId int) []string {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
	}
	rows, _ := db.Query("SELECT categoryName FROM categories WHERE postId=?", postId)
	var resSlc []string
	var category string
	for rows.Next() {
		rows.Scan(&category)
		resSlc = append(resSlc, category)
	}
	return resSlc
}

func getPostsByQuery(db *sql.DB, query, userId string) []GetPostInfo {
	rows, err := db.Query(query)
	if err != nil {
		fmt.Println(err)
	}

	var posts []GetPostInfo
	for rows.Next() {
		var post GetPostInfo
		err := rows.Scan(
			&post.PostId, &post.PostHeader, &post.PostContent, &post.CreatorId,
			&post.CreatorNickname, &post.Likes, &post.Dislikes, &post.Comments,
			&post.CreationDate,
		)
		post.Categories = getCategories(post.PostId)
		if err != nil {
			fmt.Println(err)
		}
		userReaction := userReactionType(db, post.PostId, userId, "post")
		if userReaction != "" {
			if userReaction == "like" {
				post.LikedByCurrentUser = true
			} else {
				post.DislikedByCurrentUser = true
			}
		}

		posts = append(posts, post)
	}
	return posts
}
