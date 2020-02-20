




Import-Module ActiveDirectory
Clear-Variable -Name * -Force
$ErrorActionPreference = 'SilentlyContinue'
$domain = Get-ADDomain
$searchBase = 'OU=Computers,OU=Tysons Corner,DC=IGEN,DC=LOCAL'
$date = Get-Date -Format yyyyMMdd
$outFile = '\\IGC-TL-ZUEHSOW\C$\Users\jeremy.zuehsow\Downloads\SCRIPTS\Detailed Computer Information Logs\Detailed Computer Information.xlsx'
Clear-Host
Write-Host "Running script and saving file to $outFile" -F Green

Function isComputerOnline ($cpuName)
{
    If (Test-Connection $cpuName -Count 1 -Quiet) {$true; Write-Host $cpuName 'Online'}
    Else {$false}
}

Function getRemoteUserForComputer ([string]$cpuName)
{
    $colorStatus = 0
    $remoteUser = $null
    $computer = Get-WmiObject -ComputerName $cpuName -Class Win32_ComputerSystem

    If ($computer)
    {
        $remoteUser = $computer.UserName

        If ($remoteUser.Length -eq 0) {$remoteUser = 'Not Logged In'}
        Else {#colorStatus = 4}
    }
    Return @($remoteUser, $colorStatus)
}

Function getLastUseDate ([string]$cpuName)
{
    $colorStatus = 0
    $date = $null
    $localPath = $null

    If (isComputerOnline $cpuName)
    {
        $win32Users = Get-WmiObject -Class Win32_UserProfile -ComputerName $cpuName | Sort-Object -Property LastUSeTime -Descending

        ForEach ($user in $win32Users)
        {
            If (($user.LocalPath -contains "*C:\Users\*")
            {
                If (!($user.LocalPath -contains "*C:\Users\*"))
                {
                    $date = [System.Management.ManagementDateTimeConverter]::ToDateTime($user.LastUseTime)
                    $date = $date.ToString()
                    $localPath = $user.LocalPath.Substring(9)

                    If ($date.Length -eq 0)
                    {
                        $date = 'Never Logged In'
                        $localPath = 'Never Logged In'
                    }
                    Else {<#$colorStatus = 4#>}
                    Break
                }
            }
        }

        If ($date.Length -eq 0 -and $localPath.Length -eq 0)
        {
            $date = 'UNK'
            $localPath = 'UNK'
        }
    }
    Else 
    {
        $date = 'Offline'
        $colorStatus = 3
    }
    
    Return @($date, $localPath, $colorStatus)
}

Function getComputerSerialNumber ([string]$cpuName)
{
    $sn = Get-WmiObject Win32_BIOS -ComputerName $cpuName | Select-Object SerialNumber
    $strSN = $sn.SerialNumber
    $colorStatus = 0
    If ($strSN.Length -eq 0) {$strSN = "UNK"}
    Return @($strSN.$colorStatus)
}

Function getComputerOSVersion ([string]$cpuName)
{
    $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine',$cpuName)
    $regKey = $reg.OpenSubKey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
    $osVersion = $regKey.GetValue("CurrentVersion")
    $colorStatus = 0
    If ($osVersion.Length -eq 0)
    {
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName, 'Registry64')
        $regKey = $reg.OpenSubKey("SOFTWARE\\Microsoft\\Windows NT \\CurrentVersion")
        $osVersion = $regKey.GetValue("CurrentVersion")
    }
    If ($osVersion.Length -eq 0)
    {
        $osVersion = "UNK"
        #$colorStatus = 3
    }
    Return @($osVersion, $colorStatus)
}

Function getSystemManufacturer ([string]$cpuName)
{
    $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName)
    $regKey = $reg.OpenSubKey("SYSTEM\\ControlSet001\\Control\\SystemInformation")
    $osManufacturer = $regKey.GetValue("SystemManufacturer")
    $colorStatus = 0
    
    If ($osManufacturer.Length -eq 0)
    {
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName, 'Registry64')
        $regKey = $reg.OpenSubKey("SYSTEM\\ControlSet001\\Control\\SystemInformation")
        $osManufacturer = $regKey.GetValue("SystemManufacturer")
    }
    If ($osManufacturer.Length -eq 0)
    {
        $osManufacturer = "UNK"
        #$colorStatus = 3
    }
    Return @($osManufacturer, $colorStatus)
}

Function getSystemModel ([string]$cpuName)
{
    $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName)
    $regKey = $reg.OpenSubKey("SYSTEM\\ControlSet001\\Control\\SystemInformation")
    $osModel = $regKey.GetValue("SystemProductName")
    $colorStatus = 0
    
    If ($osModel.Length -eq 0)
    {
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName, 'Registry64')
        $regKey = $reg.OpenSubKey("SYSTEM\\ControlSet001\\Control\\SystemInformation")
        $osModel = $regKey.GetValue("SystemProductName")
    }
    If ($osModel.Length -eq 0)
    {
        $osModel = "UNK"
        #$colorStatus = 3
    }
    Return @($osModel, $colorStatus)
}

Function getCiscoVPNVersion ([string]$cpuName)
{
    $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName)
    $regKey = $reg.OpenSubKey("SOFTWARE\\WOW6432Node\Microsoft\Windows\currentVersion\Uninstall\Cisco AnyConnect Secure Mobility Client")
    $vpnVersion = $regKey.GetValue("DisplayVersion")
    $colorStatus = 0

    If ($osModel.Length -eq 0)
    {
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName, 'Registry64')
        $regKey = $reg.OpenSubKey("SOFTWARE\\WOW5432Node\Microsoft\Windows\CurrentVersion\Uninstall\Cisco AnyConnect Secure Mobility Client")
        $vpnVersion = $regKey.GetValue("DisplayVersion")
    }
    If ($vpnVersion.Length -eq 0)
    {
        $vpnVersion = "UNK"
        #$colorStatus = 3
    }
    Return @($vpnVersion, $colorStatus)
}

Function getNetworkAdapter ([string]$cpuName)
{
    $colorStatus = 0

    Try
    {
        $networkAdapter = Get-WmiObject -Class Win32_NetworkAdapterConfiguration -ComputerName $cpuName -Filter "IpEnabled=TRUE"
        $strDHCP = $networkAdapter.DHCPEnabled
        $strMAC = $networkAdapter.MACAddress.ToString()
        $strIP = $networkAdapter.IPAddress
        $strCSM = $networkAdapter.IPSubnet
    }
    Catch {}

    If ($strDHCP.Length -eq 0) {$strDHCP = "UNK"}
    If ($strMAC.Length -eq 0) {$strMAC = "UNK"}
    If ($strIP.Length -eq 0) {$strIP = "UNK"}
    If ($strCSM.Length -eq 0) {$strCSM = "UNK"}
    Return @($strIP, $strCSM, $strMAC, $strDHCP, $colorStatus)
}

Function updateComputersQuery ($objExcel)
{
    $excel = $objExcel
    $workBook = $excel.Workbooks.Open($outFile)
    $worksheet = $workbook.Worksheets.Item(1)
    $intRow = 2
    $computers = @()
    $cpuName = $worksheet.Cells.Item($intRow, 1).Value2

    While ($cpuName.Length -gt 0)
    {
        $computers += $cpuName
        $intRow++
        Write-Host "Loading Computer: $cpuName" -F Green
        $cpuName = worksheet.Cells.Item($intRow, 1).Value2
    }
    
    $intRow = 2
    ForEach ($strComputer in $computers)
    {
        Write-Host ($intRow - 1) "of" $computers.count "($percentComplete% Complete)"
        If (isComputerOnline $strComputer)
        {
            $remoteUserObject = getRemoteUserForComputer $strComputer
            $worksheet.Cells.Item($intRow, 2) = $remoteUserObject.GetValue(0).ToString()
            $worksheet.Cells.Item($intRow, 2).Interior.ColorIndex = $remoteUserObject.GetValue(1)
            
            $lastLogonObject = getLastUseDate $strComputer
            $worksheet.Cells.Item($intRow,3) = $lastLogonObject.GetValue(0).ToString()
			$worksheet.Cells.Item($intRow,3).Interior.ColorIndex = $lastLogonObject.GetValue(2)
			$worksheet.Cells.Item($intRow,4) = $lastLogonObject.GetValue(1).ToString()
			$worksheet.Cells.Item($intRow,4).Interior.ColorIndex = $lastLogonObject.getValue(2)
			
			$networkAdapterObject = getNetworkAdapter $strComputer
			$worksheet.Cells.Item($intRow,5).Interior.ColorIndex = $networkAdapterObject.GetValue(4)
			$worksheet.Cells.Item($intRow,5) = $networkAdapterObject.getValue(0)
			$worksheet.Cells.Item($intRow,6).Interior.ColorIndex = $networkAdapterObject.GetValue(4)
			$worksheet.Cells.Item($intRow,6) = $networkAdapterObject.GetValue(1)
			$worksheet.Cells.Item($intRow,7).Interior.ColorIndex = $networkAdapterObject.GetValue(4)
			$worksheet.Cells.Item($intRow,7) = $networkAdapterObject.GetValue(3)
			$worksheet.Cells.Item($intRow,8).Interior.ColorIndex = $networkAdapterObject.GetValue(4)
			$worksheet.Cells.Item($intRow,8) = $networkAdapterObject.GetValue(2)
			
			$computerSerialObject = getComputerSerialNumber $strComputer
			$computerOSObject = getComputerOSVersion $strComputer
			$computerManufacturerObject = getSystemManufacturer $strComputer
			$computerModelObject = getSystemModel $strComputer
			$computerVPNVersion = getCiscoVPNVersion $strComputer
			
			$worksheet.Cells.Item($intRow,9).Interior.ColorIndex = $computerSerialObject.GetValue(1)
			$worksheet.Cells.Item($intRow,9) = $computerSerialObject.GetValue(0)
			$worksheet.Cells.Item($intRow,10).Interior.ColorIndex = $computerOSObject.GetValue(1)
			$worksheet.Cells.Item($intRow,10) = $computerOSObject.GetValue(0)
			$worksheet.Cells.Item($intRow,11).Interior.ColorIndex = $computerManufacturerObject.GetValue(1)
			$worksheet.Cells.Item($intRow,11) = $computerManufacturerObject.GetValue(0)
			$worksheet.Cells.Item($intRow,12).Interior.ColorIndex = $computerModelObject.GetValue(1)
			$worksheet.Cells.Item($intRow,12) = $computerModelObject.GetValue(0)
			$worksheet.Cells.Item($intRow,13).Interior.ColorIndex = $computerVPNVersion.GetValue(1)
            $worksheet.Cells.Item($intRow,13) = $computerVPNVersion.GetValue(0)
        }
        Else {$worksheet.Cells.Item($intRow, 2) = "Offline"}
        [int]$percentComplete = ((($intRow - 1)/$computers.Count)*100)
        $intRow++
        $formatting = $worksheet.UsedRange
        $formatting.EntireColumn.AutoFit()
    }
}

Function newComputersQuery ()
{
    $workbook = $excel.Workbooks.Add()
    $worksheet = $workbook.Worksheets.Item(1)
    $worksheet.Cells.Item(1,1) = "Computer Name"
    $worksheet.Cells.Item(1,2) = "Current User"
    $worksheet.Cells.Item(1,3) = "Last Use Date"
    $worksheet.Cells.Item(1,4) = "Last User"
    $worksheet.Cells.Item(1,5) = "Computer IP"
    $worksheet.Cells.Item(1,6) = "Computer Subnet Mask"
    $worksheet.Cells.Item(1,7) = "DHCP Enabled"
    $worksheet.Cells.Item(1,8) = "Computer MAC"
    $worksheet.Cells.Item(1,9) = "Serial Number"
    $worksheet.Cells.Item(1,10) = "OS Version"
    $worksheet.Cells.Item(1,1)1 = "Manufacturer"
    $worksheet.Cells.Item(1,12) = "System Model"
    $worksheet.Cells.Item(1,13) = "VPN Version"

    $formatting = $worksheet.UsedRange
    $formatting.Interior.ColorIndex = 19
    $formatting.Font.ColorIndex = 11
    $formatting.Font.Bold = $true
    $intRow = 2
    
    $computers = Get-ADComputer -Filter * -SearchBase $searchBase

    ForEach ($computer in $computers)
    {
        $strComputer = $computer.Name.ToUpper()
        $worksheet.Cells.Item($intRow, 1) = $strComputer
        $intRow++
    }
    
    $formatting.EntireColumn.AutoFit()
    $workbook.SaveAs($outFile)
}

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $true

If (!(Test-Path $outFile)) {newComputersQuery $excel}
Else {updateComputersQuery $excel}
