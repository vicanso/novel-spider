package mq

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/mozillazg/request"
	nsq "github.com/nsqio/go-nsq"
	"go.uber.org/zap"
)

var (
	json = jsoniter.ConfigCompatibleWithStandardLibrary
)

const (
	// ChannelNovel novel channel
	ChannelNovel = "novel"
	// TopicUpdateChapter update chapter topic
	TopicUpdateChapter = ChannelNovel + "-updateChapter"
	// TopicAddNovel add topic
	TopicAddNovel = ChannelNovel + "-add"
	// TopicBasicInfo basic info
	TopicBasicInfo = ChannelNovel + "-basicInfo"
	// TopicChapter chapter content
	TopicChapter = ChannelNovel + "-chpater"
)

type (
	// MQ mq client
	MQ struct {
		// TODO logger 调整为interface
		Logger        *zap.Logger
		LookupAddress []string
		nodes         []*Node
		// round robin 使用的 index
		index uint32
		sync.RWMutex
	}
	// Node producer node
	Node struct {
		Hostname string `json:"hostname"`
		Address  string `json:"broadcast_address"`
		TCPPort  int    `json:"tcp_port"`
		HTTPPort int    `json:"http_port"`
		Version  string `json:"version"`
	}
)

func getNodes(address string) (nodes []*Node, err error) {
	c := new(http.Client)
	req := request.NewRequest(c)
	resp, err := req.Get("http://" + address + "/nodes")
	if err != nil {
		return
	}
	body, err := resp.Content()
	defer resp.Body.Close()
	arr := json.Get(body, "producers").ToString()
	if arr == "" {
		return
	}
	nodes = make([]*Node, 0)
	err = json.UnmarshalFromString(arr, &nodes)
	return
}

// FreshNodes 刷新nodes
func (mq *MQ) FreshNodes() (err error) {
	mq.Lock()
	defer mq.Unlock()
	for _, v := range mq.LookupAddress {
		nodes, _ := getNodes(v)
		if len(nodes) != 0 {
			mq.nodes = nodes
			break
		}
	}
	return
}

// TimedFreshNodes 定时刷新
func (mq *MQ) TimedFreshNodes(interval time.Duration) {
	defer func() {
		if err := recover(); err != nil {
			e := err.(error)
			if mq.Logger != nil {
				mq.Logger.Error("timed fresh nodes fail", zap.Error(e))
			}
			// 如果定时任务异常，等待后继续检测
			time.Sleep(30 * time.Second)
			mq.TimedFreshNodes(interval)
		}
	}()
	ticker := time.NewTicker(interval)
	for range ticker.C {
		mq.FreshNodes()
	}
}

// Select 选择 node
func (mq *MQ) Select() (node *Node) {
	mq.RLock()
	defer mq.RUnlock()
	nodes := mq.nodes
	if len(nodes) == 0 {
		return
	}
	i := atomic.AddUint32(&mq.index, 1)
	index := i % uint32(len(nodes))
	node = nodes[index]
	return
}

// Pub publish a msg
func (mq *MQ) Pub(topic string, v interface{}) (err error) {
	node := mq.Select()
	if node == nil {
		err = errors.New("there is no avaliable node")
		return
	}

	buf, err := json.Marshal(v)
	if err != nil {
		return
	}

	url := fmt.Sprintf("http://%s:%d/pub?topic=%s", node.Address, node.HTTPPort, topic)
	c := new(http.Client)
	req := request.NewRequest(c)
	req.Body = bytes.NewReader(buf)
	resp, err := req.Post(url)
	if err != nil {
		return
	}
	_, err = resp.Content()
	defer resp.Body.Close()
	if err != nil {
		return
	}
	return
}

// Sub sub message
func (mq *MQ) Sub(topic, channel string, handler nsq.Handler) (consummer *nsq.Consumer, err error) {
	consummer, err = nsq.NewConsumer(topic, channel, nsq.NewConfig())
	if err != nil {
		return
	}
	consummer.AddHandler(handler)
	addressList := []string{}
	for _, node := range mq.nodes {
		address := fmt.Sprintf("%s:%d", node.Address, node.TCPPort)
		addressList = append(addressList, address)
	}
	err = consummer.ConnectToNSQDs(addressList)
	return
}
