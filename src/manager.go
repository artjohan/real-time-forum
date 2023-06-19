package src

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Manager struct {
	clients ClientList
	sync.RWMutex
	handlers map[string]EventHandler
}

func NewManager() *Manager {
	m := &Manager{
		clients:  make(ClientList),
		handlers: make(map[string]EventHandler),
	}

	m.setupEventHandlers()
	return m
}

func (m *Manager) routeEvent(event Event, c *Client) error {
	if handler, ok := m.handlers[event.Type]; ok {
		if err := handler(event, c); err != nil {
			return err
		}
		return nil
	} else {
		return errors.New("there is no such event type")
	}
}

func (m *Manager) setupEventHandlers() {
	m.handlers[EventSendMessage] = SendMessageHandler
	m.handlers[EventGetMessages] = GetMessagesHandler
	m.handlers[EventGetChatbarData] = GetChatbarDataHandler
	m.handlers[EventUpdateChatbarData] = UpdateChatbarData
}

func SendMessageHandler(event Event, c *Client) error {
	var chatEvent SendMessageEvent
	if err := json.Unmarshal(event.Payload, &chatEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	var returnMsg ReturnMessageEvent
	returnMsg.SentDate = time.Now().Format("2006-01-02 15:04:05")
	returnMsg.Message = chatEvent.Message
	returnMsg.ReceiverId = chatEvent.ReceiverId
	returnMsg.SenderId = chatEvent.SenderId

	addMessageToTable(returnMsg)

	data, err := json.Marshal(returnMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	var outgoingEvent Event
	outgoingEvent.Payload = data
	outgoingEvent.Type = EventNewMessage

	for client := range c.manager.clients {

		if client.userId == returnMsg.ReceiverId {
			client.egress <- outgoingEvent
		}

	}
	return nil
}

func GetMessagesHandler(event Event, c *Client) error {
	var chatDataEvent SendChatDataEvent
	if err := json.Unmarshal(event.Payload, &chatDataEvent); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	data, err := json.Marshal(getChatData(chatDataEvent.CurrentChatterId, chatDataEvent.OtherChatterId, chatDataEvent.Amount))
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	var outgoingEvent Event
	outgoingEvent.Payload = data
	outgoingEvent.Type = EventGetMessages
	c.egress <- outgoingEvent

	return nil
}

func GetChatbarDataHandler(event Event, c *Client) error {
	var userId int
	if err := json.Unmarshal(event.Payload, &userId); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}

	data, err := json.Marshal(getChatbarData(userId))
	if err != nil {
		return fmt.Errorf("failed to marshal broadcast message: %v", err)
	}

	var outgoingEvent Event
	outgoingEvent.Payload = data
	outgoingEvent.Type = EventGetChatbarData
	c.egress <- outgoingEvent

	return nil
}

func UpdateChatbarData(event Event, c *Client) error {
	var msg string
	if err := json.Unmarshal(event.Payload, &msg); err != nil {
		return fmt.Errorf("bad payload in request: %v", err)
	}
	fmt.Println(msg)

	return broadcastUpdate(c)
}

func broadcastUpdate(c *Client) error {
	for client := range c.manager.clients {
		data, err := json.Marshal(getChatbarData(client.userId))
		if err != nil {
			log.Printf("failed to marshal broadcast message: %v", err)
		}

		var outgoingEvent Event
		outgoingEvent.Payload = data
		outgoingEvent.Type = EventGetChatbarData
		client.egress <- outgoingEvent
	}
	return nil
}

func (m *Manager) ServeWS(w http.ResponseWriter, r *http.Request) {
	log.Println("new connection")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err, "18")
		return
	}

	userId, _ := strconv.Atoi(r.URL.Query().Get("userId"))
	client := NewClient(conn, m, userId)

	m.addClient(client)

	// start client processes
	go client.readMessages()
	go client.writeMessages()
}

func (m *Manager) addClient(client *Client) {
	m.Lock()
	defer m.Unlock()

	timer := time.NewTimer(3 * time.Second)

	go func() {
		<-timer.C
		if m.isClientOnline(client.userId) && hasSession(client.userId){
			updateUserStatus(true, client.userId)
			broadcastUpdate(client)
		}
	}()

	m.clients[client] = true

}

func (m *Manager) removeClient(client *Client) {
	m.Lock()
	defer m.Unlock()

	if _, ok := m.clients[client]; ok {

		timer := time.NewTimer(3 * time.Second)

		go func() {
			<-timer.C
			if !m.isClientOnline(client.userId) {
				updateUserStatus(false, client.userId)
				broadcastUpdate(client)
			}
		}()

		client.connection.Close()
		delete(m.clients, client)
	}
}

func (m *Manager) isClientOnline(userId int) bool {
	m.Lock()
	defer m.Unlock()

	for client, _ := range m.clients {
		if client.userId == userId {
			return true
		}
	}

	return false
}
