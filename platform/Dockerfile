# Image chung cho cac binary cua nen tang (id, adapter).
# Chon binary bang ARG CMD luc build:
#   docker build -f platform/Dockerfile --build-arg CMD=id -t op-h5-id platform/
#
# Anh nay KHONG chua bi mat nao: khoa ky, mat khau DB va client secret deu doc tu
# bien moi truong luc chay.

FROM golang:1.24-alpine AS build
ARG CMD=id
WORKDIR /src

# Tach buoc tai module de lop cache khong vo moi khi sua ma nguon.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO tat -> binary tinh, chay duoc tren scratch/alpine ma khong can thu vien he thong.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/${CMD}

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget \
 && adduser -D -u 10001 app
ENV TZ=Asia/Ho_Chi_Minh
COPY --from=build /out/app /usr/local/bin/app
USER app
ENTRYPOINT ["/usr/local/bin/app"]
