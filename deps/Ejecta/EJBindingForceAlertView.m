#import "EJBindingForceAlertView.h"
#import "EJJavaScriptView.h"

@implementation EJBindingForceAlertView

- (id)initWithContext:(JSContextRef) ctx argc:(size_t)argc argv:(const JSValueRef [])argv {
    if (self = [super initWithContext:ctx argc:argc argv:argv] ) {}
    return self;
}

EJ_BIND_FUNCTION(alert, ctx, argc, argv) {
    NSString *title = JSValueToNSString(ctx, argv[0]);
    NSString *message = JSValueToNSString(ctx, argv[1]);
    NSString *cancelButtonTitle = JSValueToNSString(ctx, argv[2]);
	
    alertCallback = JSValueToObject(ctx, argv[3], nil);
	JSValueProtect(ctx, alertCallback);
	
    UIAlertView *alert = [[UIAlertView alloc]initWithTitle:title
										 message:message
										 delegate:self
										 cancelButtonTitle:cancelButtonTitle
										 otherButtonTitles:nil
						  ];
	
	alert.tag = AlertViewAlertTag;
    [alert show];
    [alert release];
    return NULL;
}

EJ_BIND_FUNCTION(confirm, ctx, argc, argv) {
    NSString *title = JSValueToNSString(ctx, argv[0]);
    NSString *message = JSValueToNSString(ctx, argv[1]);
    NSString *okButtonTitle = JSValueToNSString(ctx, argv[2]);
	NSString *cancelButtonTitle = JSValueToNSString(ctx, argv[3]);
	
    alertCallback = JSValueToObject(ctx, argv[4], nil);
	JSValueProtect(ctx, alertCallback);
	
    UIAlertView *alert = [[UIAlertView alloc]initWithTitle:title
										 message:message
										 delegate:self
										 cancelButtonTitle:cancelButtonTitle
										 otherButtonTitles:okButtonTitle,
						  				 nil
						  ];
	
	alert.tag = AlertViewConfirmTag;
    [alert show];
    [alert release];
    return NULL;
}


EJ_BIND_FUNCTION(getText, ctx, argc, argv) {
	if( argc < 3 ) { return NULL; }
	
	NSString *title = JSValueToNSString(ctx, argv[0]);
	NSString *message = JSValueToNSString(ctx, argv[1]);
	NSString *defaultText = JSValueToNSString(ctx, argv[2]);
	NSString *keyboardType = JSValueToNSString(ctx, argv[3]);
	NSString *buttonOkText = JSValueToNSString(ctx, argv[4]);
	NSString *buttonCancelText = JSValueToNSString(ctx, argv[5]);
	
	JSValueUnprotectSafe(ctx, alertCallback);
	alertCallback = JSValueToObject(ctx, argv[6], NULL);
	JSValueProtect(ctx, alertCallback);
	
	UIAlertView *alert = [[UIAlertView alloc] initWithTitle:title
										 message:message
										 delegate:self
										 cancelButtonTitle:buttonCancelText
										 otherButtonTitles:buttonOkText,
						  				 nil
						  ];
	
	alert.alertViewStyle = UIAlertViewStylePlainTextInput;
	
	UITextField *alertTextField = [alert textFieldAtIndex:0];
	alertTextField.text = defaultText;
	
	if ([keyboardType isEqualToString:@"NUMBER"]) {
		alertTextField.keyboardType = UIKeyboardTypeNumberPad;
	} else if ([keyboardType isEqualToString:@"EMAIL"]) {
		alertTextField.keyboardType = UIKeyboardTypeEmailAddress;
	} else if ([keyboardType isEqualToString:@"PHONE"]) {
		alertTextField.keyboardType = UIKeyboardTypePhonePad;
	} else if ([keyboardType isEqualToString:@"URL"]) {
		alertTextField.keyboardType = UIKeyboardTypeURL;
	} else {
		alertTextField.keyboardType = UIKeyboardTypeDefault;
	}
	
	alert.tag = AlertViewGetTextTag;
	[alert show];
	[alert release];
	return NULL;
}


- (BOOL)alertViewShouldEnableFirstOtherButton:(UIAlertView *)alertView {
	return YES;
}

- (void)alertView:(UIAlertView *)alertView didDismissWithButtonIndex:(NSInteger)buttonIndex {
	if (alertView.tag == AlertViewAlertTag || alertView.tag == AlertViewConfirmTag) {
		JSContextRef ctx = scriptView.jsGlobalContext;
		JSValueRef params[] = { JSValueMakeBoolean(ctx, buttonIndex) };
    	[scriptView invokeCallback:alertCallback thisObject:jsObject argc:1 argv:params];
		JSValueUnprotectSafe(ctx, alertCallback);
	}
}

- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)index {
	if( alertView.tag == AlertViewGetTextTag ) {
		NSString *text = @"";
		if( index == 1 ) {
			text = [[alertView textFieldAtIndex:0] text];
		}
		
		if (index == 1) {
			JSValueRef params[] = { NSStringToJSValue(scriptView.jsGlobalContext, text) };
			[scriptView invokeCallback:alertCallback thisObject:NULL argc:1 argv:params];
		} else {
			JSValueRef params[] = { NULL };
			[scriptView invokeCallback:alertCallback thisObject:NULL argc:1 argv:params];
		}
		
		JSValueUnprotectSafe(scriptView.jsGlobalContext, alertCallback);
		alertCallback = NULL;
	}
}

- (void)willPresentAlertView:(UIAlertView *)alertView {}
- (void)didPresentAlertView:(UIAlertView *)alertView {}
- (void)alertView:(UIAlertView *)alertView willDismissWithButtonIndex:(NSInteger)buttonIndex {}
- (void)alertViewCancel:(UIAlertView *)alertView {}

@end
