# frontend/Dockerfile

# ==========================================================
# STAGE 1: Build Stage
# ==========================================================
# React 앱 빌드 환경
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# React 앱 빌드 실행 -> /app/dist 폴더에 결과물 생성
RUN npm run build

#빌드 결과물 확인
RUN ls -l


# ==========================================================
# STAGE 2: Final Stage
# ==========================================================

# 빌드된 정적 파일을 서빙할 Nginx 서버
FROM nginx:stable-alpine


# Builder 스테이지의 /app/dist 폴더에 있는 모든 파일을
# Nginx의 기본 웹 루트 폴더(/usr/share/nginx/html)로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 우리가 만든 nginx.conf를 Nginx의 기본 설정 파일 위치에 덮어씌운다.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]