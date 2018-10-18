package novel

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/mozillazg/request"
)

const (
	xBiQuGeHost = "www.xbiquge6.com"
)

type (
	// XBiQuGe 新笔趣阁
	XBiQuGe struct {
		ID         int
		detailHTML string
	}
)

// getDetail 获取详情
func (n *XBiQuGe) getDetail() (html string, err error) {
	if n.detailHTML != "" {
		html = n.detailHTML
		return
	}
	id := n.ID
	prefix := id / 1000
	url := fmt.Sprintf("https://%s/%d_%d/", xBiQuGeHost, prefix, id)
	// 避免多次去获取detail，增加缓存
	data, _ := cache.Get(url)
	if data != nil {
		detail := data.(*detailCache)
		if detail.ExpiredAt > time.Now().Unix() {
			html = detail.HTML
			n.detailHTML = html
			return
		}
	}

	c := new(http.Client)
	req := request.NewRequest(c)
	resp, err := req.Get(url)
	if err != nil {
		return
	}
	html, err = resp.Text()
	if html != "" {
		n.detailHTML = html
	}
	cache.Add(url, &detailCache{
		HTML:      html,
		ExpiredAt: time.Now().Unix() + detailTTL,
	})

	return
}

// GetBasicInfo 获取基本信息
func (n *XBiQuGe) GetBasicInfo() (info *BasicInfo, err error) {
	html, err := n.getDetail()
	if err != nil {
		return
	}
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader([]byte(html)))
	if err != nil {
		return
	}
	q := doc.Find("#maininfo #info")
	if q.Length() == 0 {
		err = errors.New("novel not found")
		return
	}
	info = &BasicInfo{}

	info.Name = strings.TrimSpace(q.Find("h1").Text())
	authorText := q.Find("p").First().Text()

	arr := strings.Split(authorText, "：")
	if len(arr) == 2 {
		info.Author = strings.TrimSpace(arr[1])
	}

	info.Brief = strings.TrimSpace(doc.Find("#maininfo #intro").Text())

	cover, _ := doc.Find("#fmimg img").Attr("src")
	info.Cover = strings.TrimSpace(cover)

	category := doc.Find(".box_con .con_top a").Eq(1).Text()
	info.Category = strings.TrimSpace(category)

	info.Source = CategoryXBiQuGe
	info.SourceID = n.ID
	return
}

// GetChapters 获取章节列表
func (n *XBiQuGe) GetChapters() (chapters []*Chapter, err error) {
	html, err := n.getDetail()
	if err != nil {
		return
	}
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader([]byte(html)))
	if err != nil {
		return
	}
	chapters = make([]*Chapter, 0, 100)
	doc.Find("#list dd a").Each(func(i int, s *goquery.Selection) {
		title := strings.TrimSpace(s.Text())
		url, _ := s.Attr("href")
		chapters = append(chapters, &Chapter{
			Index: i,
			Title: title,
			URL:   fmt.Sprintf("https://%s%s", xBiQuGeHost, url),
		})
	})
	return
}

// GetChapter 获取章节
func (n *XBiQuGe) GetChapter(index int) (chapter *Chapter, err error) {
	chapters, err := n.GetChapters()
	if err != nil {
		return
	}
	// not found
	if index >= len(chapters) {
		return
	}
	chapter = chapters[index]
	c := new(http.Client)
	req := request.NewRequest(c)
	resp, err := req.Get(chapter.URL)
	if err != nil {
		return
	}
	html, err := resp.Text()
	if err != nil {
		return
	}
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader([]byte(html)))
	if err != nil {
		return
	}
	content, err := doc.Find("#content").Html()
	if err != nil {
		return
	}
	reg := regexp.MustCompile(`<br(/?)>`)
	arr := reg.Split(strings.TrimSpace(content), -1)
	result := []string{}
	for _, str := range arr {
		v := strings.TrimSpace(str)
		if v != "" {
			result = append(result, v)
		}
	}
	chapter.Content = strings.Join(result, "\n")
	return
}
