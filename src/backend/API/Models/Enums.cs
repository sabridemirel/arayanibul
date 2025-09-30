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

public enum TransactionStatus
{
    Pending = 1,        // Payment initialized, waiting for user to complete
    Processing = 2,     // Payment in process (3D Secure flow)
    Completed = 3,      // Payment completed, funds in escrow
    Released = 4,       // Funds released to provider
    Refunded = 5,       // Payment refunded to buyer
    Failed = 6,         // Payment failed
    Cancelled = 7       // Transaction cancelled
}

public enum PaymentGateway
{
    Iyzico = 1,
    PayTR = 2,
    Stripe = 3
}