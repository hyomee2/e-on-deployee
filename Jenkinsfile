pipeline {
    agent any

    environment {
        PROJECT_ID = 'eon-deployee'
        CLUSTER_NAME = 'e-on-k8s'
        LOCATION = 'asia-northeast3-a'
        CREDENTIALS_ID = 'gcp-key-file'
        NAMESPACE = "eon"

        FRONT_IMAGE = "hyomee2/eon-frontend"
        BACK_IMAGE  = "hyomee2/eon-backend"

        SAFE_BRANCH = "${env.BRANCH_NAME.replaceAll('[^A-Za-z0-9.-]', '-').replaceAll('-+', '-')}"
        FRONT_TAG = "${SAFE_BRANCH}-${env.BUILD_NUMBER}"
        BACK_TAG = "${SAFE_BRANCH}-${env.BUILD_NUMBER}"

        K8S_NAMESPACE = "eon"
        FRONT_BLUE = "frontend-blue"
        FRONT_GREEN = "frontend-green"
        FRONT_SERVICE = "frontend-service"

        BACK_BLUE = "backend-blue"
        BACK_GREEN = "backend-green"
        BACK_SERVICE = "backend-service"
    }

    stages {

        /* 1. 코드 체크아웃 */
        stage('Checkout') {
            steps {
                checkout scm
                echo "BRANCH_NAME = ${env.BRANCH_NAME}"
            }
        }

        /* 2. 프론트엔드 Docker 이미지 생성 */
        stage('Build Frontend Image') {
            steps {
                script {
                    dir('frontend') {
                        FRONT_DOCKER = docker.build("${FRONT_IMAGE}:${FRONT_TAG}", ".")
                    }
                }
            }
        }

        /* 3. 백엔드 Docker 이미지 생성 */
        stage('Build Backend Image') {
            steps {
                script {
                    dir('backend') {
                        BACK_DOCKER = docker.build("${BACK_IMAGE}:${BACK_TAG}", ".")
                    }
                }
            }
        }

        /* 4. Docker Hub에 push */
        stage('Push image to DockerHub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'hyomee2') {

                        // 프론트 push
                        FRONT_DOCKER.push("${FRONT_TAG}")
                        FRONT_DOCKER.push("latest")

                        // 백엔드 push
                        BACK_DOCKER.push("${BACK_TAG}")
                        BACK_DOCKER.push("latest")
                    }
                }
            }
        }

        /* 5. k8s 배포(Blue-Green) (main 브랜치에서만)*/
        stage('Deploy to K8S (Blue-Green)') {

            when {
                anyOf {
                    branch 'main'
                    expression { env.CHANGE_TARGET == 'main' }
                }
            }

            steps {
                /* GKE 인증 */
                 withCredentials([file(credentialsId: "${CREDENTIALS_ID}", variable: 'GCP_KEY')]) {
                    sh """
                        echo "💭 Authenticating with GKE"
                        gcloud auth activate-service-account --key-file=\$GCP_KEY
                        gcloud container clusters get-credentials ${CLUSTER_NAME} --zone ${LOCATION} --project ${PROJECT_ID}
                    """
                 }

                 /* BACKEND Blue–Green */
                 script {
                    echo "💭 Checking current backend live version"
                    /*
                    backend-service에서 .spec.selector.version 값을 읽어온다. -> 현재 서비스 중인 버전 감지 (blue / green)
                    */
                    def backCurrent = sh(
                        script: "kubectl get svc ${BACK_SERVICE} -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}'",
                        returnStdout: true
                    ).trim()

                    /*
                        blue -> green, green -> blue 배포 타겟 설정
                    */
                    def backTargetDeploy   = (backCurrent == "blue") ? BACK_GREEN : BACK_BLUE
                    def backTargetVersion  = (backCurrent == "blue") ? "green" : "blue"

                    echo "🔆 Backend current: ${backCurrent}, deploying to: ${backTargetDeploy}"

                    /*
                    새 Deployment에 이미지 업데이트
                    &
                    rollout completion 확인
                    (파드가 restart되고 ready가 될 때까지 jenkins가 기다리며, readinessProbe가 실패하면 중단됨)
                    */
                    sh """
                        kubectl set image deployment/${backTargetDeploy} backend=${BACK_IMAGE}:${BACK_TAG} -n ${NAMESPACE}
                        kubectl rollout status deployment/${backTargetDeploy} -n ${NAMESPACE}
                    """

                    /*
                    트래픽을 새로운 버전으로 전환 (service selector 전환)
                    */
                    sh """
                        kubectl patch service ${BACK_SERVICE} -n ${NAMESPACE} -p \
                        '{"spec": {"selector": {"app": "backend", "version": "${backTargetVersion}"}}}'
                    """

                    echo "✅ Backend switch complete from ${backCurrent} to ${backTargetDeploy}"
                 }

                 /* FRONTEND Blue–Green*/
                 script {
                    echo "💭 Checking current frontend live version"

                    def frontCurrent = sh(
                        script: "kubectl get svc ${FRONT_SERVICE} -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}'",
                        returnStdout: true
                    ).trim()

                    def frontTargetDeploy   = (frontCurrent == "blue") ? FRONT_GREEN : FRONT_BLUE
                    def frontTargetVersion  = (frontCurrent == "blue") ? "green" : "blue"

                    echo "🔆 Frontend current: ${frontCurrent}, deploying to: ${frontTargetDeploy}"

                    sh """
                        kubectl set image deployment/${frontTargetDeploy} frontend=${FRONT_IMAGE}:${FRONT_TAG} -n ${NAMESPACE}
                        kubectl rollout status deployment/${frontTargetDeploy} -n ${NAMESPACE}
                    """

                    sh """
                        kubectl patch service ${FRONT_SERVICE} -n ${NAMESPACE} -p \
                        '{"spec": {"selector": {"app": "frontend", "version": "${frontTargetVersion}"}}}'
                    """

                    echo "✅ Frontend Blue-Green switch complete"
                    echo "✅ All Blue-Green deployments finished"
                 }
            }
        }
    }
}
