pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND  = "ims-backend"
        DOCKER_IMAGE_FRONTEND = "ims-frontend"
        SONAR_PROJECT_KEY     = "ims-zeotap"
        AWS_REGION            = "ap-south-1"
        ECR_REGISTRY          = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "Branch: ${env.GIT_BRANCH} | Commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Deps') {
                    steps { dir('backend') { sh 'npm ci' } }
                }
                stage('Frontend Deps') {
                    steps { dir('frontend') { sh 'npm ci' } }
                }
            }
        }

        stage('Lint') {
            parallel {
                stage('Backend Lint') {
                    steps { dir('backend') { sh 'npm run lint || true' } }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('backend') {
                    sh 'npm test -- --coverage --coverageReporters=lcov'
                }
            }
            post {
                always {
                    junit 'backend/coverage/junit.xml'
                    publishHTML([reportDir: 'backend/coverage/lcov-report', reportFiles: 'index.html', reportName: 'Coverage Report'])
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh """
                        sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.sources=backend/src,frontend/src \
                          -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info \
                          -Dsonar.exclusions=**/node_modules/**,**/dist/**
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh "docker build -t ${DOCKER_IMAGE_BACKEND}:${env.BUILD_NUMBER} -t ${DOCKER_IMAGE_BACKEND}:latest ./backend"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh "docker build -t ${DOCKER_IMAGE_FRONTEND}:${env.BUILD_NUMBER} -t ${DOCKER_IMAGE_FRONTEND}:latest ./frontend"
                    }
                }
            }
        }

        stage('Security Scan — Trivy') {
            parallel {
                stage('Scan Backend') {
                    steps {
                        sh """
                            trivy image \
                              --exit-code 0 \
                              --severity HIGH,CRITICAL \
                              --format template \
                              --template "@/usr/local/share/trivy/templates/html.tpl" \
                              -o trivy-backend.html \
                              ${DOCKER_IMAGE_BACKEND}:latest
                        """
                    }
                }
                stage('Scan Frontend') {
                    steps {
                        sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_IMAGE_FRONTEND}:latest"
                    }
                }
            }
            post {
                always {
                    publishHTML([reportDir: '.', reportFiles: 'trivy-backend.html', reportName: 'Trivy Security Report'])
                }
            }
        }

        stage('Push to ECR') {
            when { branch 'main' }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-creds']]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        docker tag ${DOCKER_IMAGE_BACKEND}:latest ${ECR_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${env.BUILD_NUMBER}
                        docker push ${ECR_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${env.BUILD_NUMBER}
                        docker tag ${DOCKER_IMAGE_FRONTEND}:latest ${ECR_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${env.BUILD_NUMBER}
                        docker push ${ECR_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${env.BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                sh 'docker-compose down && docker-compose up -d --build'
                sh 'sleep 15 && curl -f http://localhost:4000/health || exit 1'
            }
        }
    }

    post {
        always {
            sh 'docker system prune -f || true'
            cleanWs()
        }
        success { echo "✅ Pipeline succeeded: Build #${env.BUILD_NUMBER}" }
        failure { echo "❌ Pipeline failed: Build #${env.BUILD_NUMBER}" }
    }
}
