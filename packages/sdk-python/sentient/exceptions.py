class SentientError(Exception):
    """Base exception for Sentient Browser operations."""
    pass


class SentientRPCError(SentientError):
    """Raised when the WebSocket server returns an RPC error."""
    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(f"RPC Error ({code}): {message}")


class SentientConnectionError(SentientError):
    """Raised when connection to the Sentient Browser server fails."""
    pass
