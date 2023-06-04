package src

import (
	"database/sql"
	"fmt"
	"io/ioutil"

	_ "github.com/mattn/go-sqlite3"
)

func Init() {
	dataBase, e := sql.Open("sqlite3", "./forum-database/database.db")
	if e != nil {
		fmt.Println(e)
		return
	}
	if dbIsEmpty() {
		sqlInit, _ :=  ioutil.ReadFile("./forum-database/init.sql")
		dataBase.Exec(string(sqlInit))
	}
}

func dbIsEmpty() bool {
	dbText, _ := ioutil.ReadFile("./forum-database/database.db")
	if(len(dbText) == 0) {
		return true
	}
	return false
}