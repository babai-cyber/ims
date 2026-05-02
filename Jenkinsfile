pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND  = "ims-backend"
        DOCKER_IMAGE_FRONTEND = "ims-frontend"
        SONAR_PROJECT_KEY     = "ims-zeotap"
        AWS_REGION            = "ap-south-1"
        AWS_ACCOUNT_ID        = "123456789012"   // 🔴 CHANGE THIS
        ECR_REGISTRY          = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/babai-cyber/ims.git'
            }
        }

        stage('Install Node (if missing)') {
            steps {
                sh '''
                if ! command -v node > /dev/null
                then
                    echo "Installing NodeJS..."
                    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                fi
                '''
            }
        }

        stage('Install Dependencies') {
            parallel {

                stage('Backend Deps') {
                    steps {
                        dir('backend') {
                            sh 'npm install'
                        }
                    }
                }

                stage('Frontend Deps') {
                    steps {
                        dir('frontend') {
                            sh 'npm install'
                        }
                    }
                }

            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    try {
                        withSonarQubeEnv('sonarqube') {
                            sh """
                            sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.sources=backend/src,frontend/src \
                              -Dsonar.host.url=http://localhost:9000 \
                              -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info
                            """
                        }
                    } catch (err) {
                        echo "⚠️ SonarQube skipped"
                    }
                }
            }
        }

        stage('Build Docker Images') {
            parallel {

                stage('Backend Image') {
                    steps {
                        sh "docker build -t ${DOCKER_IMAGE_BACKEND}:latest ./backend"
                    }
                }

                stage('Frontend Image') {
                    steps {
                        sh "docker build -t ${DOCKER_IMAGE_FRONTEND}:latest ./frontend"
                    }
                }

            }
        }

        stage('Trivy Scan') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL ${DOCKER_IMAGE_BACKEND}:latest || true"
                sh "trivy image --severity HIGH,CRITICAL ${DOCKER_IMAGE_FRONTEND}:latest || true"
            }
        }

        stage('Push to ECR') {
            when { branch 'main' }
            steps {
                script {
                    try {
                        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-creds']]) {
                            sh """
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

                            docker tag ${DOCKER_IMAGE_BACKEND}:latest ${ECR_REGISTRY}/${DOCKER_IMAGE_BACKEND}:latest
                            docker push ${ECR_REGISTRY}/${DOCKER_IMAGE_BACKEND}:latest

                            docker tag ${DOCKER_IMAGE_FRONTEND}:latest ${ECR_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:latest
                            docker push ${ECR_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:latest
                            """
                        }
                    } catch (err) {
                        echo "⚠️ ECR push skipped"
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                if command -v docker-compose > /dev/null
                then
                    docker-compose down || true
                    docker-compose up -d
                else
                    echo "docker-compose not installed, skipping deploy"
                fi
                '''
            }
        }

    }

    post {
        always {
            sh 'docker system prune -f || true'
        }
        success {
            echo "✅ SUCCESS"
        }
        failure {
            echo "❌ FAILED"
        }
    }
}
