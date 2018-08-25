# novel-spider

## docker run

```bash
docker run -d \
	--restart=always \
	-v /data/novel-spider/config:/config \
	-e CONFIG=/config \
	--name=spider \
	vicanso/novel-spider
```
