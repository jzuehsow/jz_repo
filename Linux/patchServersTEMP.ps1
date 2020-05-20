$serverList = Import-Csv "SERVER LIST FILE"
$servers = @()
$devServers = @()
$prodServers = @()
$openshiftMSTR = "MASTER A"


Function operation_Timeout
{
    If ($count -gt 20)
    {
        Write-Host "Operation timed out. Check manually." -F Yellow
        Pause
        Exit
    }
}

Function oc_Login
{
    oc login
    #ENTER CREDS FOR OC LOGIN
}

Function drain_Node
{
    oc_Login
    oc adm manage-node $serverDNS --schedulable=false
    oc adm drain $serverDNS --ignore-daemonsets=true --delete-local-data=true
}

Function add_Node
{
    oc_Login
    oc adm manage-node $serverDNS --schedulable=true
}

Function patch_Server
{
    sudo yum update -y
    sudo shutdown -r
}


ForEach ($item in $serverList)
{
    If ($item.Prod) {$prodServers += $item}
    Else {$devServers += $item}
}

Do
{
    $patchProd = Read-Host "Patch production servers (Y/N)"

    If ($patchProd -eq 'Y') {$servers = $prodServers}
    ElseIf ($patchProd -eq 'N') {$servers = $devServers}
    Else {Write-Host "Invalid Selection`n" -F Red}
}
Until ($servers)

ForEach ($server in $servers)
{
    $serverDNS = $server.DNS
    
    If ($server.Cluster) {drain_Node}
    patch_Server
}

$count = 0
Do
{
    $count++; operation_Timeout
    $offline = @()
    ForEach ($server in $servers)
    {
        $serverName = $server.Name
        $serverDNS = $server.DNS
        
        If (Test-Connection $serverIP -Count 1 -Quiet)
        {
            If ($cluster) {add_Node}
            Write-Host "$serverName is Online" -F Green
        }
        Else
        {
            Write-Host "$serverName is OFFLINE" -F Red
            $offline += $serverName
        }
    }
}
Until (!$offline)