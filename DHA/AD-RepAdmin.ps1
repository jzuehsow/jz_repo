




$date = Get-Date -Format yyyy-MM-dd-HHmm
repadmin.exe /replsum | 
out-file "[LOG PATH]\Replication\replication-$date.txt" -Append