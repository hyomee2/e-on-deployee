## Blue-Green 기반 CI/CD 파이프라인 구축
기존에 로컬에서 구축된 서비스를 받아, Jenkins 기반 CI/CD 파이프라인과 Kubernetes(GKE) + Nginx Ingress + Blue-Green 배포 전략을 통해 안정적인 무중단 배포 환경을 구축한 프로젝트입니다.

## 1️⃣ Rolling Update -> Blue-Green 전환 배경
- 기존 Rolling Update의 한계들 중, 특히 실서버에서 배포 전 테스트가 불가하다는 점에서 운영 환경에서 새 버전을 사전 검증하기 위해 Blue-Green 배포를 도입했습니다.

## 2️⃣ 시스템 아키텍처
<img width="1420" height="916" alt="image" src="https://github.com/user-attachments/assets/f40126c4-eb33-4fe4-9946-33c7dc4418aa" />

## 3️⃣ 트래픽 흐름과 역할

### 1. Cloud Load Balancer
- 외부에서 GKE로 들어오는 모든 트래픽의 최초 진입 지점
- 사용자가 https://eon.r-e.kr 접속 시 가장 먼저 도달 (현재는 접속 불가)
- HTTPS 요청을 클러스터 내부의 Nginx Ingress Controller로 전달

### 2. Nginx Ingress Controller
- 요청 URL 경로를 기준으로 '/api'는 backend-service(4000), '/'는 frontend-service(80)로 트래픽 분기 (클러스터 내부 L7 라우팅)
- cert-manager가 발급한 TLS 인증서를 사용하여 HTTPS 복호화 (TLS 종료)
- 이때, ingress는 Blud/Green 여부를 인지하지 않고, 항상 Service 단위로만 트래픽을 전달한다.

#### (1) TLS 인증서 자동화 (Cert-manager + Let's Encrypt)
**Cert-manager**
- Kubernetes 클러스터 내부에서 동작하는 인증서 관리 컨트롤러
- ingress.yml에 설정된 cert-manager.io/cluster-issuer: "letsencrypt-prod" 를 감지해 해당 인증 기관에서 TLS 인증서 발급을 자동으로 수행
- 발급된 인증서는 Kubernetes Secret(eon-tls-cert) 형태로 저장하고, 해당 Secret을 참조하여 Nginx Ingress Controller는 TLS 종료
- 인증서 만료 전 자동 갱신으로 운영 개입 최소화

### 3. Service 기반 Blue-Green 트래픽 제어
- Service는 spec.selector.version 값에 지정된 blue/green에 따라 트래픽을 전달해주고, 트래픽 전환은 즉각적으로 이루어진다.

```yaml
selector:
  app: backend
  version: blue
```
 
#### (1) Frontend
- React 앱을 정적으로 빌드 후 Nginx로 서빙
- SPA 라우팅은 컨테이너 내부 Nginx에서 처리
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

#### (2) Backend & Database
- Database는 CloudSQL(MYSQL)을 사용하며, Blue, Green 두 버전이 공유하여, 애플리케이션은 분리하되 데이터 일관성 유지

## 4️⃣ CI(Continuous Integration) 파이프라인 흐름
- Jenkins 멀티브랜치 파이프라인으로 구성
  
  -> 각 브랜치를 자동으로 감지하여 Jenkinsfile 기준으로 CI 파이프라인 생성 및 실행하여 안정성 확보
#### 1. GitHub push
#### 2. 소스코드 체크아웃
- Jenkins가 해당 브랜치의 소스 코드를 가져온다.
- 프론트엔드, 백엔드 중 변경된 서비스만 빌드 및 배포하기 위해 git diff를 이용해 변경된 파일 목록을 가져온 후, 변경 여부를 저장한다. (env.FRONT_CHANGED, env.BACK_CHANGED)
#### 3. Docker image build
- 변경된 서비스만 Dockerfile을 기반으로 이미지를 빌드한다.
#### 4. DockerHub push
- DockerHub에 변경된 서비스 이미지만 push 한다.

## 5️⃣ CD(Continuous Deployment) 파이프라인 흐름
- CI 파이프라인 이후, main 브랜치에 대해서만 CD 파이프라인이 실행된다.
#### 1. GKE 인증 및 클러스터 접근
#### 2. 현재 운영중인 버전(Blue/Green) 확인
#### 3. 운영중이 아닌 버전 Deployment에 신규 버전 이미지 적용
#### 4. 해당 Deployment의 Pod가 rollout 완료될 때까지 대기
#### 5. Service의 selector를 변경하여 트래픽을 신규 버전으로 즉시 전환
#### 6. Discord로 배포 성공 여부 및 Deployment 변경 사항 알림 전달

## 6️⃣ k8s 디렉토리 구조
```
k8s/
├── ingress.yml
├── cluster-issuer.yml
├── frontend-service.yml
├── backend-service.yml
├── frontend-blue.yml
├── frontend-green.yml
├── backend-blue.yml
└── backend-green.yml
```

## 7️⃣ 고려해야 할 사항
- Blue-Green 배포의 경우 운영 환경과 동일한 두배의 컴퓨팅 리소스를 일시적으로 유지해야 하므로 높은 인프라 비용이 요구된다.
- 또한, 두 버전이 공유하는 데이터베이스 스키마 변경이 있을 경우에 대한 전략이 필요하다.
- 따라서 여러 배포 방식의 Trade-off를 고려하여, 적용하려는 서비스에 적합한 배포 전략 수립이 필요하다!
