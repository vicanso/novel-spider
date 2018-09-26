package novel

import (
	lru "github.com/hashicorp/golang-lru"
	jsoniter "github.com/json-iterator/go"
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
		Name    string `json:"name,omitempty"`
		Author  string `json:"author,omitempty"`
		Index   int    `json:"index,omitempty"`
		Title   string `json:"title,omitempty"`
		URL     string `json:"url,omitempty"`
		Content string `json:"content,omitempty"`
	}
	// Source source info
	Source struct {
		Category string `json:"category,omitempty"`
		ID       int    `json:"id,omitempty"`
		// LatestChapter latest chapter index
		LatestChapter int `json:"latestChapter,omitempty"`
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
