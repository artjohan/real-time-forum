package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"01.kood.tech/git/aaaspoll/real-time-forum/src"
)

func main() {
	fileServer := http.FileServer(http.Dir("./static/"))
	src.Init()
	http.Handle("/static/", http.StripPrefix("/static", fileServer))
	http.HandleFunc("/", src.HomePageHandler)
	http.HandleFunc("/post-register", src.RegisterHandler)
	http.HandleFunc("/post-login", src.LoginHandler)
	http.HandleFunc("/get-cookie", src.CookieHandler)
	http.HandleFunc("/post-logout", src.LogOutHandler)
	http.HandleFunc("/create-post", src.CreatePostHandler)
	http.HandleFunc("/get-posts", src.GetPostsHandler)
	http.HandleFunc("/create-comment", src.CreateCommentHandler)
	http.HandleFunc("/get-post-details", src.GetPostDetailsHandler)
	http.HandleFunc("/post-reaction", src.ReactionHandler)
	http.HandleFunc("/get-filtered-posts", src.CategoryFilterHandler)
	http.HandleFunc("/get-all-categories", src.AllCategoriesHandler)
	http.HandleFunc("/get-user-info", src.GetUserInfoHandler)
	http.HandleFunc("/get-created-posts", src.GetCreatedPostsHandler)
	http.HandleFunc("/get-created-comments", src.GetCreatedCommentsHandler)
	http.HandleFunc("/get-liked-posts", src.GetLikedPostsHandler)
	http.HandleFunc("/get-liked-comments", src.GetLikedCommentsHandler)
	http.HandleFunc("/get-disliked-posts", src.GetDislikedPostsHandler)
	http.HandleFunc("/get-disliked-comments", src.GetDislikedCommentsHandler)
	http.HandleFunc("/get-nickname", src.GetNicknameHandler)
	http.HandleFunc("/ws", src.NewManager().ServeWS)
	portNr := getPortNr()
	fmt.Printf("Started server at http://localhost:%v\n", portNr)
	// runs server
	if err := http.ListenAndServe(":"+strconv.Itoa(portNr), nil); err != nil {
		log.Fatal(err)
	}
}
// checks if inputted port nr exists/is correct
func getPortNr() int {
	if len(os.Args) == 2 {
		n, e := strconv.Atoi(os.Args[1])
		if e == nil && (n > 1023 && n < 65536) {
			return n
		}
	}
	return 8080
}