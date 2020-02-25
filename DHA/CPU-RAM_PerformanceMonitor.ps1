



$ErrorActionPreference = 'SilentlyContinue'
$logPath = [LOGPATH]
$warn = "{0:P0}" -f (.75)
$crit = "{0:P0}" -f (.9)
$critMax = "{0:P0}" -f (1)
$alertCap = '10'
$shellHeader = Clear-Host; "Domain Controll`tProcessor Load`tMemory Load`tAlert Count"
$
$
$searchBase = [DC OU]
$servers = (Get-ADComputer -Filter * -SearchBase $searchBase).Name | Sort
$serverArray @()
ForEach ($server in $servers) {$serverArray[$server] = $null}

Function sendMail
{
    $fromMBX = [From Mailbox]
    $toMBX = [TO Mailbox]
    $subject = "ALERT: DOMAIN CONTROLLER IN CRITICAL STATE - $server"
    $body = "See attached log file."
    $smtp = [SMTP Server]
    Send-MailMessage -From $fromMBX -To $toMBX -Subject $subject -Body $body -Attachments $logFile -SmtpServer $smtp
}

While ($true)
{
    $date = Get-Date -Format yyyy-MM-dd
    $logFile = "$logPath\$date - DC_Performance_Alert_Logs.csv"
    $table = @()

    If (!(Test-Path $logFile))
    {
        If (!(Test-Path $logPath)) {New-Item $logPath -ItemType directory | Out-Null}
        New-Item $logFile -ItemType file | Out-Null
        "{0},{1},{2},{3},{4}" -f "Date","Time","Domain Controller","Usage","Resource" | Add-Content -Path $logFile
    }

    ForEach ($server in $servers)
    {
        $procLoad = "{0:P0}" -f ((Get-WmiObject Win32_Processor -ComputerName $server | Measure-Object -Property LoadPercentage -Average).Average /100)
        $procCharCount = ($procLoad | Measure-Object -Character).Characters
        If ($procCharCount -lt 4) {$procLoad = "0" + $procLoad}

        $memLoad = "{0:P0}" -f ((Get-WmiObject Win32_PerfFormattedData_PerfOS_Memory -ComputerName $server).PercentCommittedBytesInUse /100)
        $memCharCount = ($memLoad | Measure-Object -Character).Characters
        If ($memCharCount -lt 4) {$memLoad = "0" + $memLoad}

        If (($procLoad -ge $crit) -or ($memLoad -ge $crit) -or ($procLoad -eq '0' -and $memLoad -eq '0'))
        {
            $serverArray[$server]++
            If ($serverArray[$server -ge $alertThreshold]) {sendMail}
        }
        ElseIf (($procLoad -lt $critical) -and ($memLoad -lt $critical) -and ($procLoad -ne '0') -and ($memLoad -ne '0')) {$serverArray[$server] = @()}

        $hash = [pscustomobject]@{
            DomainController = $server
            ProcessorLoad = "Processor"
            MemoryLoad = "Memory"
            AlertCount = $serverArray[$server]
        }
        $table += $hash
    }
    
    Write-Host $shellHeader
    ForEach ($row in $table)
    {
        $dc = $row.DomainController
        $procLoad = $row.ProcessorLoad
        $memLoad = $row.MemoryLoad
        $alertCount = $row.AlertCount
        $shellLine = "$dc`t$procLoad`t$memLoad`t$alertCount"

        If ($procLoad -gt $critical -or $procLoad -eq $critMax -or $row.MemoryLoad -gt $critical -or $row.MemoryLoad -eq $critMax)
        {
            $time = Get-Date -Format HH:mm
            If ($procLoad -gt $crit -or $procLoad -eq $critMax) {"{0},{1},{2},{3},{4}" -f $date,$time,$dc,$procLoad,"Processor" | Add-Content $logFile}
            If ($memLoad -gt $crit -or $memLoad -eq $critMax) {"{0},{1},{2},{3},{4}" -f $date,$time,$dc,$memLoad,"Memory" | Add-Content $logFile}
            Write-Host $shellLine -F Red
        }
        ElseIf ($procLoad -gt $warn -or $memLoad -gt $warn) {Write-Host $shellLine -F Yellow}
        Else {Write-Host $shellLine -F White}
    }
}