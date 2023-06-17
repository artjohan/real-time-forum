package sqldb

import (
	"database/sql"
	"log"
)

var DB *sql.DB

func OpenDatabase() {
	database, err := sql.Open("sqlite3", "./forum-database/database.db")
	if err != nil {
		log.Println(err)
		return
	}

	DB = database
}
