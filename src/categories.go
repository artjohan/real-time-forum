package src

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

func CategoryFilterHandler(w http.ResponseWriter, r *http.Request) {
	categoryName := r.URL.Query().Get("category")
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
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
		INNER JOIN categories AS c ON p.postId = c.postId
		WHERE c.categoryName = ?
	`


	rows, err := db.Query(query, categoryName)
	if err != nil {
		fmt.Println(err)
		return
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
			return
		}

		posts = append(posts, post)
	}

	jsonData, err := json.Marshal(posts)
	if err != nil {
		fmt.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func AllCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	db, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		fmt.Println(err)
		return
	}

	rows, err := db.Query("SELECT categoryName FROM categories")
	if err != nil {
		fmt.Println(err)
	}

	var resSlc []string
	var category string
	for rows.Next() {
		rows.Scan(&category)
		resSlc = append(resSlc, category)
	}

	jsonData, err := json.Marshal(removeDuplicateStr(resSlc))
	if err != nil {
		fmt.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}