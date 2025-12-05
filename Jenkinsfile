def notifyDiscord(String title, String color, String description) {
    withCredentials([string(credentialsId: 'discord-webhook', variable: 'HOOK')]) {

        def payload = groovy.json.JsonOutput.toJson([
            embeds: [[
                title: title,
                description: description,
                color: color.toInteger()
            ]]
        ])

        sh(
            script: """#!/bin/bash
                curl -H "Content-Type: application/json" \
                -X POST \
                -d '${payload}' \
                "\$HOOK"
            """,
            label: "Send Discord Notification"
        )
    }
}


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

                script {
                    // 변경된 파일 목록 가져오기 (프론트/백 중 변경된 서비스만 빌드/배포)
                    def changed = sh(
                        script: "git diff --name-only HEAD~1 HEAD || true",
                        returnStdout: true
                    ).trim()

                    env.FRONT_CHANGED = changed.contains("frontend/") ? "true" : "false"
                    env.BACK_CHANGED  = changed.contains("backend/") ? "true" : "false"
                }
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
                        if (env.FRONT_CHANGED == "true") {
                            FRONT_DOCKER.push("${FRONT_TAG}")
                            FRONT_DOCKER.push("latest")
                        }

                        // 백엔드 push
                        if (env.BACK_CHANGED == "true") {
                            BACK_DOCKER.push("${BACK_TAG}")
                            BACK_DOCKER.push("latest")
                        }
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

                script {
                    // 결과 알림에서 표시하기 위해 저장
                    env.BACK_FROM = "-"
                    env.BACK_TO   = "-"
                    env.FRONT_FROM = "-"
                    env.FRONT_TO   = "-"
                }

                 // BACKEND Blue–Green
                 script {
                    if (env.BACK_CHANGED == "true") {
                        echo "💭 Checking current backend live version"

                        def backCurrent = sh(
                            script: "kubectl get svc ${BACK_SERVICE} -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}'",
                            returnStdout: true
                        ).trim()

                    def backTargetDeploy   = (backCurrent == "blue") ? BACK_GREEN : BACK_BLUE
                    def backTargetVersion  = (backCurrent == "blue") ? "green" : "blue"

                    echo "🔆 Backend current: ${backCurrent}, deploying to: ${backTargetDeploy}"

                    env.BACK_FROM = backCurrent
                    env.BACK_TO   = backTargetVersion

                    // 새 Deployment에 이미지 업데이트 & rollout completion 확인 & 트래픽을 새로운 버전으로 전환 (service selector 전환)
                    sh """
                        kubectl set image deployment/${backTargetDeploy} backend=${BACK_IMAGE}:${BACK_TAG} -n ${NAMESPACE}
                        kubectl rollout status deployment/${backTargetDeploy} -n ${NAMESPACE}
                        kubectl patch service ${BACK_SERVICE} -n ${NAMESPACE} -p '{"spec": {"selector": {"app": "backend", "version": "${backTargetVersion}"}}}'
                    """

                    echo "✅ Backend switch complete from ${backCurrent} to ${backTargetDeploy}"
                    }
                 }

                 /* FRONTEND Blue–Green*/
                 script {
                    if (env.FRONT_CHANGED == "true") {
                        echo "💭 Checking current frontend live version"

                        def frontCurrent = sh(
                            script: "kubectl get svc ${FRONT_SERVICE} -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}'",
                            returnStdout: true
                        ).trim()

                        def frontTargetDeploy   = (frontCurrent == "blue") ? FRONT_GREEN : FRONT_BLUE
                        def frontTargetVersion  = (frontCurrent == "blue") ? "green" : "blue"

                        echo "🔆 Frontend current: ${frontCurrent}, deploying to: ${frontTargetDeploy}"

                        env.FRONT_FROM = frontCurrent
                        env.FRONT_TO   = frontTargetVersion

                        sh """
                            kubectl set image deployment/${frontTargetDeploy} frontend=${FRONT_IMAGE}:${FRONT_TAG} -n ${NAMESPACE}
                            kubectl rollout status deployment/${frontTargetDeploy} -n ${NAMESPACE}
                            kubectl patch service ${FRONT_SERVICE} -n ${NAMESPACE} -p '{"spec": {"selector": {"app": "frontend", "version": "${frontTargetVersion}"}}}'
                        """

                        echo "✅ Frontend Blue-Green switch complete"
                    }

                    echo "✅ All Blue-Green deployments finished"
                 }
            }
        }
    }

    /* Discord 알림 */
    post {
        success {
            script {
                if (env.BRANCH_NAME == "main" || env.CHANGE_TARGET == "main") {
                    notifyDiscord(
                        "🎉 Blue/Green 배포 완료",
                        "3066993",
                        """
                    **Backend:** ${env.BACK_FROM} → ${env.BACK_TO}
                    **Frontend:** ${env.FRONT_FROM} → ${env.FRONT_TO}

                    **변경사항:** ${env.SAFE_BRANCH}-${env.BUILD_NUMBER}

                    배포가 성공적으로 완료되었습니다!
                    """
                        .stripIndent().trim()
                    )
                }
            }
        }

        failure {
            script {
                if (env.BRANCH_NAME == "main" || env.CHANGE_TARGET == "main") {
                    // 로그 보여주기
                    def logSnippet = currentBuild.rawBuild?.getLog(20)?.join("\\n") ?: "로그 없음"

                    notifyDiscord(
                        "❌ 배포 실패",
                        "15158332",
                        """
                        배포 중 오류가 발생했습니다.

                        ${logSnippet}
                        """
                    )
                }
            }
        }
    }
}
