package src

import (
	"io/ioutil"
	
	"01.kood.tech/git/aaaspoll/real-time-forum/sqldb"
	_ "github.com/mattn/go-sqlite3"
)

func Init() {
	sqldb.OpenDatabase()
	
	if dbIsEmpty() {
		sqlInit, _ := ioutil.ReadFile("./forum-database/init.sql")
		sqldb.DB.Exec(string(sqlInit))
	} else {
		resetUserStatuses()
	}
}

func dbIsEmpty() bool {
	dbText, _ := ioutil.ReadFile("./forum-database/database.db")
	return len(dbText) == 0
}
