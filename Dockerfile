FROM golang:1.10-alpine as builder

RUN apk update \
  && apk add git make g++ bash cmake \
  && git clone --depth=1 https://github.com/vicanso/novel-spider.git --branch go /go/src/github.com/vicanso/novel-spider \
  && go get -u github.com/golang/dep/cmd/dep \
  && cd /go/src/github.com/vicanso/novel-spider \
  && dep ensure \
  && GOOS=linux GOARCH=amd64 go build -tags netgo -o novel-spider 


FROM alpine

COPY --from=builder /go/src/github.com/vicanso/novel-spider/novel-spider /usr/local/bin/novel-spider

CMD ["novel-spider"]
