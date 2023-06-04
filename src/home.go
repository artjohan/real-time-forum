package src

import (
	"html/template"
	"net/http"
)

func HomePageHandler(w http.ResponseWriter, r *http.Request) {
	temp, err := template.ParseFiles("./static/index.html")
	if err != nil {
		http.Redirect(w, r, "/", http.StatusInternalServerError)
		return
	}
	if e := temp.Execute(w, nil); e != nil {
		http.Redirect(w, r, "/", http.StatusInternalServerError)
	}
}
