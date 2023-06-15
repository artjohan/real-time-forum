package src

import (
	"database/sql"
	"io/ioutil"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func Init() {
	dataBase, e := sql.Open("sqlite3", "./forum-database/database.db")
	if e != nil {
		log.Println(e)
		return
	}
	if dbIsEmpty() {
		sqlInit, _ := ioutil.ReadFile("./forum-database/init.sql")
		dataBase.Exec(string(sqlInit))
	}
}

func dbIsEmpty() bool {
	dbText, _ := ioutil.ReadFile("./forum-database/database.db")
	return len(dbText) == 0
}
