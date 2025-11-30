pipeline {
    agent any

    environment {
        FRONT_IMAGE = "hyomee2/eon-frontend"
        BACK_IMAGE  = "hyomee2/eon-backend"

        SAFE_BRANCH = "${env.BRANCH_NAME.replaceAll('[^A-Za-z0-9.-]', '-').replaceAll('-+', '-')}"
        FRONT_TAG   = "${SAFE_BRANCH}-${env.BUILD_NUMBER}"
        BACK_TAG    = "${SAFE_BRANCH}-${env.BUILD_NUMBER}"
    }

    stages {

        /* 1. 코드 체크아웃 */
        stage('Checkout') {
            steps {
                checkout scm
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

        /* 5. Docker Hub에 push */
        stage('Push image to DockerHub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-cred') {

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

//         /* 6. 배포 (main 브랜치에서만) */
//         stage('Deploy') {
//             when { branch 'main' }
//             steps {
//                 sh """
//                 ssh ubuntu@<SERVER-IP> '
//                     docker pull ${FRONT_IMAGE}:${FRONT_TAG} &&
//                     docker pull ${BACK_IMAGE}:${BACK_TAG} &&
//
//                     docker stop eon-front || true &&
//                     docker rm eon-front || true &&
//                     docker run -d --name eon-front -p 80:80 ${FRONT_IMAGE}:${FRONT_TAG} &&
//
//                     docker stop eon-back || true &&
//                     docker rm eon-back || true &&
//                     docker run -d --name eon-back -p 4000:4000 ${BACK_IMAGE}:${BACK_TAG}
//                 '
//                 """
//             }
//         }
    }
}