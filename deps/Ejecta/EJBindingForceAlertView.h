#import "EJBindingBase.h"

enum {
	AlertViewAlertTag = 1,
	AlertViewConfirmTag = 2,
	AlertViewGetTextTag = 3
};

@interface EJBindingForceAlertView : EJBindingBase <UIAlertViewDelegate> {
	JSObjectRef alertCallback;
}

@end
