namespace API.Models;

public enum UserType
{
    Buyer = 1,
    Provider = 2,
    Both = 3
}

public enum NeedStatus
{
    Active = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
    Expired = 5
}

public enum OfferStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,
    Withdrawn = 4
}

public enum UrgencyLevel
{
    Flexible = 1,
    Normal = 2,
    Urgent = 3
}

public enum MessageType
{
    Text = 1,
    Image = 2,
    Location = 3
}