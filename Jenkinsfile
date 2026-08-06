pipeline {
    agent any

    environment {
        APP_NAME = "gerar-cenario-teste-app"
        DIST_APP_NAME = "gerar-cenario-teste-app"
        TOMCAT_WEBAPPS_WINDOWS = "C:\\apache-tomcat-11.0.11\\webapps"
        TOMCAT_WEBAPPS_UNIX = "/opt/homebrew/opt/tomcat/libexec/webapps"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
                            node -v
                            npm -v
                            npm install
                            npm run build
                        '''
                    } else {
                        bat '''
                            call npm install
                            call npm run build
                        '''
                    }
                }
            }
        }

        stage('Deploy Frontend') {
            when {
                expression {
                    return env.BRANCH_NAME == 'main' || env.GIT_BRANCH == 'origin/main'
                }
            }

            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            TOMCAT_WEBAPPS="${TOMCAT_WEBAPPS_UNIX}"
                            DIST_BROWSER="${WORKSPACE}/dist/${DIST_APP_NAME}/browser"

                            rm -rf "$TOMCAT_WEBAPPS/$APP_NAME"
                            mkdir -p "$TOMCAT_WEBAPPS/$APP_NAME"

                            cp -R "$DIST_BROWSER/"* "$TOMCAT_WEBAPPS/$APP_NAME/"
                        '''
                    } else {
                        bat '''
                            set TOMCAT_WEBAPPS=%TOMCAT_WEBAPPS_WINDOWS%
                            set DIST_BROWSER=%WORKSPACE%\\dist\\%DIST_APP_NAME%\\browser

                            if exist "%TOMCAT_WEBAPPS%\\%APP_NAME%" (
                                rmdir /S /Q "%TOMCAT_WEBAPPS%\\%APP_NAME%"
                            )

                            mkdir "%TOMCAT_WEBAPPS%\\%APP_NAME%"

                            xcopy /E /I /Y "%DIST_BROWSER%\\*" "%TOMCAT_WEBAPPS%\\%APP_NAME%\\"
                        '''
                    }
                }
            }
        }
    }
}
