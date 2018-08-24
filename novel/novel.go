package novel

import (
	lru "github.com/hashicorp/golang-lru"
	jsoniter "github.com/json-iterator/go"
	"github.com/nsqio/go-nsq"
)

const (
	// CategoryXBiQuGe xbiquge category
	CategoryXBiQuGe = "xBiQuGe"
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
		Name     string `json:"name,omitempty"`
		Author   string `json:"author,omitempty"`
		Brief    string `json:"brief,omitempty"`
		Cover    string `json:"cover,omitempty"`
		Category string `json:"category,omitempty"`
		Source   string `json:"source,omitempty"`
		SourceID int    `json:"sourceId,omitempty"`
	}
	// Chapter 章节信息
	Chapter struct {
		Index   int    `json:"index,omitempty"`
		Title   string `json:"title,omitempty"`
		URL     string `json:"url,omitempty"`
		Content string `json:"content,omitempty"`
	}
	// Source source info
	Source struct {
		Category string `json:"category,omitempty"`
		ID       int    `json:"id,omitempty"`
		// ChapterIndex chapter index
		ChapterIndex int `json:"chapterIndex,omitempty"`
	}
	// BasicInfoHandlerCb add handler call back function
	BasicInfoHandlerCb func(info *BasicInfo)
	// ChaperHandlerCb update chapter call back function
	ChaperHandlerCb func(chapter *Chapter)
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
	if s.Category == CategoryXBiQuGe {
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
func CreateUpdateChapterHandler(cb ChaperHandlerCb) nsq.Handler {
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

// CreateReceiveChapterHandler create a receive chapter handler
func CreateReceiveChapterHandler(cb ChaperHandlerCb) nsq.Handler {
	return nsq.HandlerFunc(func(msg *nsq.Message) (err error) {
		chapter := &Chapter{}
		err = json.Unmarshal(msg.Body, chapter)
		if err != nil {
			return
		}
		cb(chapter)
		return
	})
}

// CreateAddHandler create a add handler
func CreateAddHandler(cb BasicInfoHandlerCb) nsq.Handler {
	return nsq.HandlerFunc(func(msg *nsq.Message) (err error) {
		n, _, err := getNovel(msg)
		if err != nil {
			return
		}
		info, err := n.GetBasicInfo()
		if err != nil {
			return
		}
		if cb != nil && info != nil {
			cb(info)
		}
		return
	})
}

// CreateReceiveBasicInfoHandler create a receive handler
func CreateReceiveBasicInfoHandler(cb BasicInfoHandlerCb) nsq.Handler {
	return nsq.HandlerFunc(func(msg *nsq.Message) (err error) {
		info := &BasicInfo{}
		err = json.Unmarshal(msg.Body, info)
		if err != nil {
			return
		}
		cb(info)
		return
	})
}
