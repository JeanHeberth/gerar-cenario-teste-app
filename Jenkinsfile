pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                bat '''
                    call npm install
                    call npm run build
                '''
            }
        }

        stage('Deploy Frontend') {
            when {
                expression {
                    return env.GIT_BRANCH == 'origin/main'
                }
            }

            steps {
                bat '''
                    set TOMCAT_WEBAPPS=C:\\apache-tomcat-11.0.11\\webapps
                    set APP_NAME=%JOB_NAME%

                    rmdir /S /Q "%TOMCAT_WEBAPPS%\\%APP_NAME%"
                    mkdir "%TOMCAT_WEBAPPS%\\%APP_NAME%"

                    xcopy /E /I /Y "%WORKSPACE%\\dist\\*" "%TOMCAT_WEBAPPS%\\%APP_NAME%\\"
                '''
            }
        }
    }
}
