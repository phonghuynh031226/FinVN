class VCBNeedOtpException(Exception):
    def __init__(self, message: str, browser_id: str, browser_token: str, duration: int = 90):
        super().__init__(message)
        self.message = message
        self.browser_id = browser_id
        self.browser_token = browser_token
        self.duration = duration


class BIDVNeedConfirmAppException(Exception):
    def __init__(self, message: str, user: str, duration: int = 120):
        super().__init__(message)
        self.message = message
        self.user = user
        self.duration = duration


class BIDVNeedOtpException(Exception):
    def __init__(self, message: str, user: str, token: str, duration: int = 90):
        super().__init__(message)
        self.message = message
        self.user = user
        self.token = token
        self.duration = duration
