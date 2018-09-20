package main

import (
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/vicanso/novel-spider/novel"

	"github.com/vicanso/novel-spider/config"
	"github.com/vicanso/novel-spider/mq"
	"go.uber.org/zap"
)

var (
	json      = jsoniter.ConfigCompatibleWithStandardLibrary
	logger, _ = zap.NewProduction()
)

// 初始化 update chapter event
func initUpdateChapterEvent(c *mq.MQ) (err error) {
	cb := func(chapter *novel.Chapter) {
		err := c.Pub(mq.TopicChapter, chapter)
		if err != nil {
			logger.Error("pub update chapter fail",
				zap.String("title", chapter.Title),
				zap.Int("index", chapter.Index),
				zap.Error(err))
		}
	}
	c.SubUpdateChapter(cb)
	return
}

// 初始化 add event
func initAddEvent(c *mq.MQ) (err error) {
	cb := func(info *novel.BasicInfo) {
		err := c.Pub(mq.TopicBasicInfo, info)
		if err != nil {
			logger.Error("pub basic info fail",
				zap.String("name", info.Name),
				zap.String("author", info.Author),
				zap.Error(err))
		}
	}
	err = c.SubAddNovel(cb)
	return
}

func main() {
	address := config.GetStringSlice("nsq.lookup.address")

	c := &mq.MQ{
		LookupAddress: address,
		Logger:        logger,
	}
	c.FreshNodes()
	go c.TimedFreshNodes(time.Second * 60)
	if err := initUpdateChapterEvent(c); err != nil {
		panic(err)
	}
	if err := initAddEvent(c); err != nil {
		panic(err)
	}
	logger.Info("novel spider is running")

	ch := make(chan int)
	<-ch
}
