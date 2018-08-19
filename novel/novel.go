package novel

type (
	// Novel novel interface
	Novel interface {
		GetBasicInfo() (*BasicInfo, error)
		GetChapters() ([]*Chapter, error)
		GetChapter(int) (*Chapter, error)
	}
	// BasicInfo 基本信息
	BasicInfo struct {
		Name   string
		Author string
		Brief  string
		Cover  string
	}
	// Chapter 章节信息
	Chapter struct {
		Titile  string
		URL     string
		Content string
	}
)
