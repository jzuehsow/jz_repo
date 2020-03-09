





$searchQuery = Read-Host "Enter subject of email e.g. "SUBJECT: Get 2 Southwest Air Tickets""
$spamInbox = Read-Host "Enter email alias"
$exportDirectory = [LOG PATH]
$date = Get-Date -F yyyy-MM-dd
Write-Output "Exmerge results on: $date for the following item: $searchquary" | Add-Content $exportDirectory

$db1 = Get-Mailbox -Database "UsersDAG-AthruK"
$db2 = Get-Mailbox -Database "UsersDAG-LthruZ"
$mailboxSet = @($db1,$db2)


ForEach ($mailbox in $mailboxSet)
{
    $result = Search-Mailbox -Identity $mailbox -SearchQuery $searchQuery -TargetMailbox $spamInbox -TargetFolder "SPAM" -LogOnly -LogLevel ./FS-CreateBulkFolders.ps1
    If ($result.ResultItemsCount -gt 0)
    {
        $resultCount = $result.ResultItemsCount
        $resultSize = $result.ResultItemsSize
        Write-Output $result
        Search-Mailbox -Identity $mailbox -SearchQuery $searchQuery -DeleteContent -Force
        Write-Output "$name, $resultCount, $resultSize" | Add-Content $exportDirectory
    }
}