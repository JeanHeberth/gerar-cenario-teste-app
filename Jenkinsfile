pipeline {
  agent any

  parameters {
    booleanParam(
      name: 'DRY_RUN',
      defaultValue: true,
      description: 'Quando true, nao copia para Tomcat; apenas mostra as acoes.'
    )
    booleanParam(
      name: 'RUN_TESTS',
      defaultValue: false,
      description: 'Executa testes unitarios do frontend.'
    )
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipStagesAfterUnstable()
    skipDefaultCheckout(true)
    timeout(time: 30, unit: 'MINUTES')
  }

  environment {
    CI = 'true'
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm-cache"
  }

  stages {
    stage('Checkout') {
      steps {
        echo '[Checkout] Baixando codigo do repositorio...'
        checkout scm
      }
    }

    stage('Build') {
      steps {
        script {
          echo '[Build] Instalando dependencias e gerando dist...'
          echo "[Build] Cache npm: ${env.NPM_CONFIG_CACHE}"
          if (isUnix()) {
            sh '''
              set -e
              mkdir -p "$NPM_CONFIG_CACHE"
              npm ci --prefer-offline --no-audit
              npm run build
            '''
          } else {
            bat '''
              if not exist "%NPM_CONFIG_CACHE%" mkdir "%NPM_CONFIG_CACHE%"
              call npm ci --prefer-offline --no-audit
              call npm run build
            '''
          }
        }
      }
    }

    stage('Test (Opcional)') {
      when {
        expression { return params.RUN_TESTS }
      }
      steps {
        script {
          echo '[Test] Executando testes unitarios...'
          if (isUnix()) {
            sh 'npm run test -- --watch=false --browsers=ChromeHeadless'
          } else {
            bat 'call npm run test -- --watch=false --browsers=ChromeHeadless'
          }
        }
      }
    }

    stage('Deploy Frontend em Tomcat') {
      when {
        expression {
          def target = (env.CHANGE_TARGET ?: '').toLowerCase()
          def branch = (env.BRANCH_NAME ?: '').toLowerCase()
          def gitBranch = (env.GIT_BRANCH ?: '').toLowerCase()

          return ['main', 'master'].contains(target) ||
                 ['main', 'master'].contains(branch) ||
                 ['origin/main', 'origin/master', 'main', 'master'].contains(gitBranch)
        }
      }
      steps {
        script {
          def appName = env.JOB_BASE_NAME ?: 'gerar-cenario-teste-app'

          if (params.DRY_RUN) {
            echo "[Deploy] DRY_RUN=true. Deploy nao sera executado."
            echo "[Deploy] Webapp de destino (nome): ${appName}"
            return
          }

          if (isUnix()) {
            sh """
              set -e

              APP_NAME='${appName}'
              DIST_PRIMARY="\$WORKSPACE/dist/gerar-cenario-teste-app/browser"
              DIST_FALLBACK="\$WORKSPACE/dist/gerar-cenario-teste-app"

              if [ -d "\$DIST_PRIMARY" ]; then
                DIST_DIR="\$DIST_PRIMARY"
              elif [ -d "\$DIST_FALLBACK" ]; then
                DIST_DIR="\$DIST_FALLBACK"
              else
                echo "Dist nao encontrada. Verificado: \$DIST_PRIMARY e \$DIST_FALLBACK"
                exit 1
              fi

              TOMCAT_WEBAPPS="\${TOMCAT_WEBAPPS:-/opt/homebrew/opt/tomcat/libexec/webapps}"
              DEST_DIR="\$TOMCAT_WEBAPPS/\$APP_NAME"

              [ -d "\$TOMCAT_WEBAPPS" ] || { echo "Diretorio Tomcat nao encontrado: \$TOMCAT_WEBAPPS"; exit 1; }

              echo "Limpando destino: \$DEST_DIR"
              rm -rf "\$DEST_DIR"
              mkdir -p "\$DEST_DIR"

              echo "Copiando dist para webapps: \$DEST_DIR"
              cp -R "\$DIST_DIR"/. "\$DEST_DIR"/

              echo "Deploy concluido em \$DEST_DIR"
            """
          } else {
            bat """
              set APP_NAME=${appName}
              set DIST_PRIMARY=%WORKSPACE%\\dist\\gerar-cenario-teste-app\\browser
              set DIST_FALLBACK=%WORKSPACE%\\dist\\gerar-cenario-teste-app

              if exist "%DIST_PRIMARY%" (
                set DIST_DIR=%DIST_PRIMARY%
              ) else (
                if exist "%DIST_FALLBACK%" (
                  set DIST_DIR=%DIST_FALLBACK%
                ) else (
                  echo Dist nao encontrada. Verificado: %DIST_PRIMARY% e %DIST_FALLBACK%
                  exit /b 1
                )
              )

              if "%TOMCAT_WEBAPPS%"=="" (
                set TOMCAT_WEBAPPS=C:\\apache-tomcat-11.0.11\\webapps
              )

              set DEST_DIR=%TOMCAT_WEBAPPS%\\%APP_NAME%

              if not exist "%TOMCAT_WEBAPPS%" (
                echo Diretorio Tomcat nao encontrado: %TOMCAT_WEBAPPS%
                exit /b 1
              )

              echo Limpando destino: %DEST_DIR%
              if exist "%DEST_DIR%" rmdir /S /Q "%DEST_DIR%"
              mkdir "%DEST_DIR%"

              echo Copiando dist para webapps: %DEST_DIR%
              xcopy "%DIST_DIR%\\*" "%DEST_DIR%\\" /E /I /Y

              echo Deploy concluido em %DEST_DIR%
            """
          }
        }
      }
    }
  }

  post {
    success {
      echo '[Pipeline] Execucao concluida com sucesso.'
    }
    failure {
      echo '[Pipeline] Falha detectada. Verifique o stage com erro.'
    }
    always {
      archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
      cleanWs(
        deleteDirs: true,
        disableDeferredWipeout: true,
        patterns: [[pattern: '.npm-cache/**', type: 'EXCLUDE']]
      )
    }
  }
}
