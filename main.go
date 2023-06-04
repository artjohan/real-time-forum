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