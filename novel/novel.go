package novel

import (
	lru "github.com/hashicorp/golang-lru"
	jsoniter "github.com/json-iterator/go"
	"github.com/nsqio/go-nsq"
)

const (
	// CategoryXBiQuge xbiquge category
	CategoryXBiQuge = "xBiQuge"
)

var (
	json  = jsoniter.ConfigCompatibleWithStandardLibrary
	cache *lru.Cache
	// detail cache ttl(seconds)
	detailTTL int64 = 10 * 60
)

type (
	detailCache struct {
		HTML      string
		ExpiredAt int64
	}
	// Novel novel interface
	Novel interface {
		GetBasicInfo() (*BasicInfo, error)
		GetChapters() ([]*Chapter, error)
		GetChapter(int) (*Chapter, error)
	}
	// BasicInfo 基本信息
	BasicInfo struct {
		Name   string `json:"name"`
		Author string `json:"author"`
		Brief  string `json:"brief"`
		Cover  string `json:"cover"`
	}
	// Chapter 章节信息
	Chapter struct {
		Index   int    `json:"index"`
		Title   string `json:"title"`
		URL     string `json:"url"`
		Content string `json:"content"`
	}
	// Source source info
	Source struct {
		Category string `json:"category"`
		ID       int    `json:"id"`
		// ChapterIndex chapter index
		ChapterIndex int `json:"chapterIndex,omitempty"`
	}
	// AddHandlerCb add handler call back function
	AddHandlerCb func(info *BasicInfo)
	// UpdateChaperHandlerCb update chapter call back function
	UpdateChaperHandlerCb func(chapter *Chapter)
)

func init() {
	c, err := lru.New(128)
	if err != nil {
		panic(err)
	}
	cache = c
}

// New create a novel instance
func New(s Source) Novel {
	if s.Category == CategoryXBiQuge {
		return &XBiQuGe{
			ID: s.ID,
		}
	}
	return nil
}

func getNovel(msg *nsq.Message) (n Novel, s *Source, err error) {
	s = &Source{}
	err = json.Unmarshal(msg.Body, s)
	if err != nil {
		return
	}
	n = New(*s)
	return
}

// CreateUpdateChapterHandler create a update chapter handler
func CreateUpdateChapterHandler(cb UpdateChaperHandlerCb) nsq.Handler {
	return nsq.HandlerFunc(func(msg *nsq.Message) (err error) {
		n, s, err := getNovel(msg)
		if err != nil {
			return
		}
		chapter, err := n.GetChapter(s.ChapterIndex)
		if err != nil {
			return
		}
		if cb != nil && chapter != nil && chapter.Title != "" {
			cb(chapter)
		}
		return
	})
}

// CreateAddHandler create a add handler
func CreateAddHandler(cb AddHandlerCb) nsq.Handler {
	return nsq.HandlerFunc(func(msg *nsq.Message) (err error) {
		n, _, err := getNovel(msg)
		if err != nil {
			return
		}
		info, err := n.GetBasicInfo()
		if err != nil {
			return
		}
		if cb != nil && info != nil && info.Name != "" && info.Author != "" {
			cb(info)
		}
		return
	})
}
