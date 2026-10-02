pipeline {
    agent any
    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }
    environment {
        DOCKER_IMAGE = 'taskmanagement-api'
        SONAR_HOST_URL = 'http://localhost:9000'
        SONAR_CREDENTIAL_ID = 'SonarQube_Token'

        STAGING_CONTAINER = 'taskmanagement-api-staging'
        PRODUCTION_CONTAINER = 'taskmanagement-api-prod'

        STAGING_URL = 'http://localhost:5001/health'
        PRODUCTION_URL = 'http://localhost:5000/health'
        METRICS_URL = 'http://localhost:5000/metrics'
        PROMETHEUS_URL = 'http://localhost:9090/-/healthy'

        PREVIOUS_PRODUCTION_IMAGE = ''
    }

    stages {
        stage('1. Build') {
            steps {
                echo '========================================'
                echo 'STAGE 1 - BUILD'
                echo '========================================'
                bat 'npm install'
                script {
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
                    env.FULL_IMAGE = "${env.DOCKER_IMAGE}:${env.IMAGE_TAG}"
                }
                echo "Building Docker image: ${env.FULL_IMAGE}"
                bat """
                    docker build ^
                    -t ${FULL_IMAGE} ^
                    -t ${DOCKER_IMAGE}:latest .
                """
                bat """
                    docker image inspect ${FULL_IMAGE} >nul
                    if errorlevel 1 (
                        echo Docker image verification failed.
                        exit /b 1
                    )
                """
            }
        }

        stage('2. Automated Test') {
            steps {
                echo '========================================'
                echo 'STAGE 2 - AUTOMATED TEST'
                echo '========================================'
                bat '''
                    if exist junit.xml del /f /q junit.xml
                    set "JEST_JUNIT_OUTPUT_FILE=%CD%\\junit.xml"
                    npm run test:ci
                    if not exist junit.xml (
                        echo ERROR: junit.xml was not generated.
                        exit /b 1
                    )
                '''
            }
            post {
                always {
                    junit(testResults: 'junit.xml', allowEmptyResults: false)
                }
            }
        }

        stage('3. Code Quality') {
            steps {
                echo '========================================'
                echo 'STAGE 3 - CODE QUALITY'
                echo '========================================'
                withCredentials([string(credentialsId: "${SONAR_CREDENTIAL_ID}", variable: 'SONAR_TOKEN')]) {
                    bat """
                        npx sonarqube-scanner ^
                        -Dsonar.host.url=${SONAR_HOST_URL} ^
                        -Dsonar.token=%SONAR_TOKEN% ^
                        -Dsonar.qualitygate.wait=true
                    """
                }
            }
        }

        stage('4. Security Scan') {
            steps {
                echo '========================================'
                echo 'STAGE 4 - SECURITY'
                echo '========================================'
                bat 'npm audit --audit-level=high || exit 0'
                bat """
                    docker run --rm ^
                    -v //var/run/docker.sock:/var/run/docker.sock ^
                    aquasec/trivy:latest image --severity HIGH,CRITICAL --format table ${FULL_IMAGE}
                """
                bat """
                    docker run --rm ^
                    -v //var/run/docker.sock:/var/run/docker.sock ^
                    aquasec/trivy:latest image --severity CRITICAL --ignore-unfixed --skip-files /usr/local/lib/node_modules/npm/node_modules/tar/package.json --exit-code 1 ${FULL_IMAGE}
                """
            }
        }

        stage('5. Deploy to Staging') {
            steps {
                echo '========================================'
                echo 'STAGE 5 - STAGING DEPLOYMENT'
                echo '========================================'
                bat """
                    docker rm -f ${STAGING_CONTAINER} >nul 2>&1
                    exit /b 0
                """
                bat 'set "IMAGE=${FULL_IMAGE}" && docker-compose up -d staging'
                script {
                    waitForHttp(env.STAGING_URL, 20, 3)
                }
            }
        }

        stage('6. Release to Production') {
            steps {
                echo '========================================'
                echo 'STAGE 6 - PRODUCTION RELEASE'
                echo '========================================'
                script {
                    def containerExists = bat(returnStatus: true, script: "docker inspect ${env.PRODUCTION_CONTAINER} >nul 2>&1")
                    if (containerExists == 0) {
                        env.PREVIOUS_PRODUCTION_IMAGE = bat(returnStdout: true, script: "docker inspect --format=\"{{.Config.Image}}\" ${env.PRODUCTION_CONTAINER}").trim()
                    } else {
                        env.PREVIOUS_PRODUCTION_IMAGE = ''
                    }
                }
                bat """
                    docker rm -f ${PRODUCTION_CONTAINER} >nul 2>&1
                    exit /b 0
                """
                bat 'set "IMAGE=${FULL_IMAGE}" && docker-compose up -d production'
                script {
                    waitForHttp(env.PRODUCTION_URL, 20, 3)
                }
            }
            post {
                failure {
                    script {
                        if (env.PREVIOUS_PRODUCTION_IMAGE?.trim()) {
                            bat "docker rm -f ${PRODUCTION_CONTAINER} >nul 2>&1 || exit /b 0"
                            bat 'set "IMAGE=${PREVIOUS_PRODUCTION_IMAGE}" && docker-compose up -d production'
                        }
                    }
                }
            }
        }

        stage('7. Monitoring & Alerting') {
            steps {
                echo '========================================'
                echo 'STAGE 7 - MONITORING & ALERTING'
                echo '========================================'
                bat 'set "IMAGE=${FULL_IMAGE}" && docker-compose up -d prometheus'
                script {
                    waitForHttp(env.PROMETHEUS_URL, 20, 3)
                    waitForHttp(env.METRICS_URL, 20, 3)
                }
            }
        }
    }

    post {
        success {
            withCredentials([string(credentialsId: 'Discord_Webhook', variable: 'HOOK')]) {
                powershell '''
                  $body = @{ content = "✅ **SUCCESS:** Jenkins build $env:BUILD_NUMBER passed all 7 DevSecOps stages and is LIVE! 🚀" } | ConvertTo-Json -Depth 10
                  Invoke-RestMethod -Uri $env:HOOK -Method Post -ContentType 'application/json' -Body $body
                '''
            }
        }
        failure {
            withCredentials([string(credentialsId: 'Discord_Webhook', variable: 'HOOK')]) {
                powershell '''
                  $body = @{ content = "🚨 **ALERT:** Jenkins build $env:BUILD_NUMBER FAILED! 🚨 Check logs: $env:BUILD_URL" } | ConvertTo-Json -Depth 10
                  Invoke-RestMethod -Uri $env:HOOK -Method Post -ContentType 'application/json' -Body $body
                '''
            }
        }
    }
}

def waitForHttp(String url, int attempts = 20, int delaySeconds = 3) {
    def command = """
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "\\$url='${url}'; ^
        for(\\$i=1; \\$i -le ${attempts}; \\$i++){ ^
            try { ^
                \\$response=Invoke-WebRequest -Uri \\$url -UseBasicParsing -TimeoutSec 5; ^
                if(\\$response.StatusCode -eq 200){ exit 0 } ^
            } catch { }; ^
            Start-Sleep -Seconds ${delaySeconds} ^
        }; ^
        exit 1"
    """
    def result = bat(returnStatus: true, script: command)
    if (result != 0) { error("Health check failed for ${url}") }
}