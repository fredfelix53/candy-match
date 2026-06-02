@echo off
if exist "%CD%\gradle\wrapper\gradle-wrapper.jar" (
    java -jar "%CD%\gradle\wrapper\gradle-wrapper.jar" %*
    exit /b %errorlevel%
)
echo Wrapper JAR not found. Use setup-gradle action in CI.
exit /b 1
