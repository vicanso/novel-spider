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
	fn := novel.CreateUpdateChapterHandler(cb)
	_, err = c.Sub(mq.TopicUpdateChapter, mq.ChannelNovel, fn)
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
	fn := novel.CreateAddHandler(cb)
	// sub 只会在处理完成之后再sub另外一个
	_, err = c.Sub(mq.TopicAddNovel, mq.ChannelNovel, fn)
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
	logger.Info("sub add and update success")
	// c.Pub(mq.TopicAddNovel, &novel.Source{
	// 	Category:     novel.CategoryXBiQuge,
	// 	ID:           78513,
	// 	ChapterIndex: 10,
	// })

	// c.Pub(TopicUpdateChapter, &novel.Source{
	// 	Category:     novel.CategoryXBiQuge,
	// 	ID:           78513,
	// 	ChapterIndex: 580,
	// })

	ch := make(chan int)
	<-ch
}
