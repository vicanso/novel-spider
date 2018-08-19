package main

import (
	"fmt"

	"github.com/vicanso/novel-spider/novel"
)

func main() {
	n := novel.XBiQuGe{
		ID: 78513,
	}
	info, _ := n.GetBasicInfo()
	chapters, _ := n.GetChapters()
	chapter, _ := n.GetChapter(10)
	fmt.Println(info)
	fmt.Println(chapters)
	fmt.Println(chapter)
}
