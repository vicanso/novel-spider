# novel-spider

此程序从mq中监听增加与更新章节事件，在接收到相应事件之后，从网站上爬取相应信息，之后写回mq中

## docker run

```bash
docker run -d \
	--restart=always \
	-v /data/novel-spider/config:/config \
	-e CONFIG=/config \
	--name=spider \
	vicanso/novel-spider
```
